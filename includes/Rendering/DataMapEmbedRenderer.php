<?php
namespace Ark\DataMaps\Rendering;

use Ark\DataMaps\Data\DataMapSpec;
use Ark\DataMaps\Data\DataMapGroupSpec;
use MediaWiki\MediaWikiServices;
use Title;
use Parser;
use ParserOutput;
use ParserOptions;
use Html;
use File;

class DataMapEmbedRenderer {
    public DataMapSpec $data;

    protected Title $title;

    protected Parser $parser;
    protected ParserOutput $parserOutput;
    protected ParserOptions $parserOptions;

    public function __construct( Title $title, DataMapSpec $data, Parser $parser ) {
        $this->title = $title;
        $this->data = $data;

        $this->parser = $parser;
        $this->parserOutput = $parser->getOutput();
        $this->parserOptions = $parser->getOptions();
    }

    public function getId(): int {
        return $this->title->getArticleID();
    }

    private function getFile(string $title): File {
        $file = MediaWikiServices::getInstance()->getRepoGroup()->findFile( trim( $title ) );
        if (!$file || !$file->exists()) {
            throw new InvalidArgumentException( "File [[File:$title]] does not exist." );
        }
		return $file;
    }

    private function getIconUrl(string $title): string {
        return $this->getFile($title)->getURL();
    }

    public function prepareOutputPage() {
        // Enable and configure OOUI
		$this->parserOutput->setEnableOOUI(true);
		\OOUI\Theme::setSingleton( new \OOUI\WikimediaUITheme() );
		\OOUI\Element::setDefaultDir( 'ltr' );

        // Required modules
        $this->parserOutput->addModules( [
            'ext.ark.datamaps.leaflet.core', 'ext.ark.datamaps.leaflet.loader'
        ] );

        // Register image dependencies
		$this->parserOutput->addImage( $this->data->getImageName() );
        $this->data->iterateGroups( function(DataMapGroupSpec $spec) {
            $this->parserOutput->addImage( $spec->getMarkerIcon() );
            $this->parserOutput->addImage( $spec->getLegendIcon() );
        } );

        // Inject mw.config variables
        $this->parserOutput->addJsConfigVars( [
            'dataMaps' => [
                $this->getId() => $this->getJsConfigVariables()
            ]
        ] );
    }

    public function getJsConfigVariables(): array {
        $usedGroups = $this->data->getMarkerGroupNames();
        $image = $this->getFile($this->data->getImageName());
        return [
            // Required to query the API for marker clusters
            'pageName' => $this->title->getPrefixedText(),
            'version' => $this->title->getLatestRevID(),

            'coordinateBounds' => $this->data->coordinateBounds,
            'image' => $image->getURL(),
            'imageBounds' => [ $image->getWidth(), $image->getHeight() ],
            
            'groups' => $this->getMarkerGroupsConfigsFor($usedGroups),

            'custom' => $this->data->getCustomData(),
        ];
    }

    public function getMarkerGroupsConfigsFor($names): array {
        $results = array();
        foreach ($names as &$name) {
            $results[$name] = $this->getMarkerGroupConfig($name);
        }
        return $results;
    }

    public function getMarkerGroupConfig(DataMapGroupSpec $spec): array {
        $out = array(
            'name' => $spec->getTitle(),
            'size' => $spec->getSize(),
        );

        switch ( $spec->getDisplayMode() ) {
            case DataMapGroupSpec::DM_CIRCLE:
                $out['fillColor'] = $this->getIconUrl( $spec->getFillColor() );
                break;
            case DataMapGroupSpec::DM_ICON:
                $out['markerIcon'] = $this->getIconUrl( $spec->getMarkerIcon() );
                break;
            default:
                throw new InvalidArgumentException( wfMessage( 'datamap-error-render-unsupported-displaymode', $spec->getDisplayMode() ) );
        }

        if ( $spec->getLegendIcon() !== null ) {
            $out['legendIcon'] = $this->getIconUrl( $spec->getLegendIcon() );
        }

        return $out;
    }

    public function getMarkerLayerConfig(string $name): array {
        //$info = $this->data->groups->$name;
        return array(
        );
    }

    public function getHtml(): string {
        $this->parser->startExternalParse($this->title, $this->parserOptions, Parser::OT_HTML);
		$panel = new \OOUI\PanelLayout( [
            'id' => 'datamap-' . $this->getId(),
            'classes' => [ 'datamap-container' ],
			'framed' => true,
			'expanded' => false,
			'padded' => true
		] );
        $panel->appendContent( new \OOUI\LabelWidget( [
            'label' => new \OOUI\HtmlSnippet(
                $this->parser->recursiveTagParseFully( ($this->data->title == null ? wfMessage('datamap-unnamed-map') : $this->data->title) )
            )
        ] ) );

        $layout = new \OOUI\Widget( [
            'classes' => [ 'datamap-layout' ]
        ] );
        $panel->appendContent( $layout );

        $legend = $this->getLegendContainerWidget();

        
		$mapPanel = new \OOUI\PanelLayout( [
			'framed' => true,
			'expanded' => false,
		] );
        $mapPanel->appendContent( new \OOUI\HtmlSnippet( $this->getLeafletContainerHtml() ) );

        $layout->appendContent( $legend );
        $layout->appendContent( $mapPanel );

        return $panel;
    }

    public function getLegendContainerWidget(): \OOUI\Widget {
        $legend = new \OOUI\Widget( [
            'classes' => [ 'datamap-legend' ]
        ] );

        $legend->appendContent( new \OOUI\LabelWidget( [
            'label' => wfMessage( 'datamap-legend-label' ),
            'classes' => [ 'datamap-legend-label' ]
        ] ) );

        return $legend;
    }

    public function getLeafletContainerHtml(): string {
		return Html::rawElement(
			'div',
			[
				'class' => 'datamap-holder'
			],
            Html::element(
                'noscript',
                null,
                wfMessage( 'datamap-javascript-disabled' )
            )
            . Html::element(
				'div',
				[
					'class' => 'datamap-status'
				],
				wfMessage( 'datamap-placeholder-loading' )
			)
		);
    }
}
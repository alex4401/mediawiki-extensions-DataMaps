<?php
namespace Ark\DataMaps\Rendering;

use Ark\DataMaps\Data\DataMapSpec;
use Ark\DataMaps\Data\DataMapGroupSpec;
use MediaWiki\MediaWikiServices;
use Title;
use Parser;
use ParserOutput;
use OutputPage;
use ParserOptions;
use Html;
use File;
use InvalidArgumentException;
use PPFrame;

class DataMapEmbedRenderer {
    const MARKER_ICON_WIDTH = 24;
    const LEGEND_ICON_WIDTH = 24;

    public DataMapSpec $data;

    private Title $title;
    private Parser $parser;
    private ParserOptions $parserOptions;

    public function __construct( Title $title, DataMapSpec $data, Parser $parser ) {
        $this->title = $title;
        $this->data = $data;

        $this->parser = $parser->getFreshParser();
        $this->parserOptions = $parser->getOptions();

        $parser->getOptions()->enableLimitReport(false);
    }

    public function getId(): int {
        return $this->title->getArticleID();
    }

    public static function getFile( string $title, int $width = -1 ) {
        $file = MediaWikiServices::getInstance()->getRepoGroup()->findFile( trim( $title ) );
        if (!$file || !$file->exists()) {
            throw new InvalidArgumentException( "File [[File:$title]] does not exist." );
        }
        if ( $width > 0 ) {
            $file = $file->transform( [
                'width' => $width
            ] );
        }
		return $file;
    }

    public static function getIconUrl( string $title, int $width = -1 ): string {
        return self::getFile( $title, $width )->getURL();
    }

    public function prepareOutput(ParserOutput &$parserOutput) {
        // Enable and configure OOUI
        $parserOutput->setEnableOOUI( true );
		\OOUI\Theme::setSingleton( new \OOUI\WikimediaUITheme() );
		\OOUI\Element::setDefaultDir( 'ltr' );

        // Required modules
        $parserOutput->addModules( [
            'ext.ark.datamaps.leaflet.core',
            'ext.ark.datamaps.loader',
            'ext.ark.datamaps.styles'
        ] );

        // Inject mw.config variables via a `dataMaps` map from ID
        $configsVar = [
            $this->getId() => $this->getJsConfigVariables()
        ];
        if ( array_key_exists( 'dataMaps', $parserOutput->mJsConfigVars ) ) {
            $configsVar = array_merge( $parserOutput->mJsConfigVars['dataMaps'], $configsVar );
        }
        $parserOutput->addJsConfigVars( 'dataMaps', $configsVar );

        // Register image dependencies
        foreach ( $this->data->getBackgrounds() as &$background ) {
            $parserOutput->addImage( $background->getImageName() );
        }
        $this->data->iterateGroups( function( DataMapGroupSpec $spec ) use ( &$parserOutput ) {
            $parserOutput->addImage( $spec->getMarkerIcon() );
            $parserOutput->addImage( $spec->getLegendIcon() );
        } );
    }

    public function getJsConfigVariables(): array {
        $out = [
            // Required to query the API for marker clusters
            'pageName' => $this->title->getPrefixedText(),
            'version' => $this->title->getLatestRevID(),

            'coordinateBounds' => $this->data->coordinateBounds,
            'backgrounds' => array_map( function ( $background ) {
                $image = $this->getFile( $background->getImageName() );
                $out = [
                    'image' => $image->getURL(),
                    'bounds' => [ $image->getWidth(), $image->getHeight() ]
                ];

                if ( $background->getName() != null ) {
                    $out['name'] = $background->getName();
                }

                if ( $background->getPlacementLocation() != null ) {
                    $out['at'] = $background->getPlacementLocation();
                }

                return $out;
            }, $this->data->getBackgrounds() ),
            
            'groups' => [],
            'layerIds' => $this->data->getLayerNames(),
            'leafletSettings' => $this->data->getInjectedLeafletSettings(),

            'custom' => $this->data->getCustomData()
        ];

        $this->data->iterateGroups( function(DataMapGroupSpec $spec) use (&$out) {
            $out['groups'][$spec->getId()] = $this->getMarkerGroupConfig($spec);
        } );

        return $out;
    }

    public function getMarkerGroupConfig(DataMapGroupSpec $spec): array {
        $out = array(
            'name' => $spec->getName(),
            'size' => $spec->getSize(),
        );

        switch ( $spec->getDisplayMode() ) {
            case DataMapGroupSpec::DM_CIRCLE:
                $out['fillColor'] = $spec->getFillColour();
                break;
            case DataMapGroupSpec::DM_ICON:
                $out['markerIcon'] = $this->getIconUrl( $spec->getMarkerIcon(), self::MARKER_ICON_WIDTH );
                break;
            default:
                throw new InvalidArgumentException( wfMessage( 'datamap-error-render-unsupported-displaymode', $spec->getDisplayMode() ) );
        }

        if ( $spec->getLegendIcon() !== null ) {
            $out['legendIcon'] = $this->getIconUrl( $spec->getLegendIcon(), self::LEGEND_ICON_WIDTH );
        }

        return $out;
    }

    public function getMarkerLayerConfig(string $name): array {
        //$info = $this->data->groups->$name;
        return array(
        );
    }

    private function expandWikitext(string $source): string {
        return $this->parser->parse( $source, $this->title, $this->parserOptions )->getText( [ 'unwrap' => true ] );
    }

    public function getHtml( DataMapRenderOptions $options ): string {
        // Primary slots
		$containerMain = new \OOUI\PanelLayout( [
            'id' => 'datamap-' . $this->getId(),
            'classes' => [ 'datamap-container' ],
			'framed' => true,
			'expanded' => false,
			'padded' => false
		] );
		$containerTop = new \OOUI\PanelLayout( [
            'classes' => [ 'datamap-container-top' ],
			'framed' => false,
			'expanded' => false,
			'padded' => false
		] );
		$containerContent = new \OOUI\PanelLayout( [
            'classes' => [ 'datamap-container-content' ],
			'framed' => false,
			'expanded' => false,
			'padded' => false
		] );

        // Stack the containers
        $containerMain->appendContent( $containerTop );
        $containerMain->appendContent( $containerContent );

        // Bar at the top with map title
        if ( $options->displayTitle ) {
            $titleText = $options->titleOverride ?? $this->data->getTitle();
            $containerTop->appendContent( new \OOUI\LabelWidget( [
                'label' => new \OOUI\HtmlSnippet( $this->expandWikitext( $titleText ) )
            ] ) );
        }

        // Left-side legend
        $containerContent->appendContent( $this->getLegendContainerWidget() );

        // Leaflet area
		$containerMap = new \OOUI\PanelLayout( [
			'framed' => true,
			'expanded' => false,
		] );
        $containerMap->appendContent( new \OOUI\HtmlSnippet( $this->getLeafletContainerHtml() ) );
        $containerContent->appendContent( $containerMap );

        return $containerMain;
    }

    public function getLegendContainerWidget(): \OOUI\Widget {
        $legend = new \OOUI\Widget( [
            'classes' => [ 'datamap-container-legend' ]
        ] );

        $legend->appendContent( new \OOUI\LabelWidget( [
            'label' => wfMessage( 'datamap-legend-label' ),
            'classes' => [ 'datamap-legend-label', 'oo-ui-tabSelectWidget-framed' ]
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
                wfMessage( 'datamap-javascript-required' )
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
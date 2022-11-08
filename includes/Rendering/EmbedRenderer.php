<?php
namespace MediaWiki\Extension\Ark\DataMaps\Rendering;

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
use FormatJson;

use MediaWiki\Extension\Ark\DataMaps\ExtensionConfig;
use MediaWiki\Extension\Ark\DataMaps\Data\DataMapSpec;
use MediaWiki\Extension\Ark\DataMaps\Data\MarkerGroupSpec;
use MediaWiki\Extension\Ark\DataMaps\Data\MarkerLayerSpec;
use MediaWiki\Extension\Ark\DataMaps\Data\MarkerSpec;
use MediaWiki\Extension\Ark\DataMaps\Data\MapBackgroundSpec;
use MediaWiki\Extension\Ark\DataMaps\Data\MapBackgroundOverlaySpec;
use MediaWiki\Extension\Ark\DataMaps\Data\MapBackgroundTileSpec;
use MediaWiki\Extension\Ark\DataMaps\Rendering\Utils\DataMapColourUtils;
use MediaWiki\Extension\Ark\DataMaps\Rendering\Utils\DataMapFileUtils;

class EmbedRenderer {
    public DataMapSpec $data;

    private Title $title;
    private bool $useInlineData;
    private bool $forVisualEditor;
    private Parser $parser;
    private ParserOutput $parserOutput;
    private ParserOptions $parserOptions;

    public function __construct( Title $title, DataMapSpec $data, Parser $parser, ParserOutput $parserOutput,
        bool $useInlineData = false, bool $forVisualEditor = false ) {
        $this->title = $title;
        $this->data = $data;
        $this->useInlineData = $useInlineData;
        $this->forVisualEditor = $forVisualEditor;

        $this->parser = $parser->getFreshParser();
        $this->parserOutput = $parserOutput;

        $this->parserOptions = ParserOptions::newCanonical( 'canonical' );
        $this->parserOptions->enableLimitReport( false );
        $this->parserOptions->setAllowSpecialInclusion( false );
        $this->parserOptions->setExpensiveParserFunctionLimit( 4 );
        $this->parserOptions->setInterwikiMagic( false );
        $this->parserOptions->setMaxIncludeSize( 800 );
        if ( $parser->getOptions() !== null ) {
            $this->parserOptions->setCurrentRevisionRecordCallback( $parser->getOptions()->getCurrentRevisionRecordCallback() );
        }

        $this->parser->setOptions( $this->parserOptions );
    }

    public function getId(): int {
        return $this->title->getArticleID();
    }

    public function prepareOutput() {
        $this->enableOOUI();
        $this->addModules();
        if ( $this->useInlineData && !$this->forVisualEditor ) {
            $this->addMarkerDataInline();
        }
        $this->updateLinks();
    }

    public function enableOOUI(): void {
        $this->parserOutput->setEnableOOUI( true );
		\OOUI\Theme::setSingleton( new \OOUI\WikimediaUITheme() );
		\OOUI\Element::setDefaultDir( 'ltr' );
    }

    public function addModules(): void {
        $this->parserOutput->addModules( [
            'ext.ark.datamaps.styles',
            // ext.ark.datamaps.leaflet.core is loaded on demand (when a DataMap is initialised) in a separate request
            // to not delay the site module
            'ext.ark.datamaps.core',
            // Initialiser module to boot the maps
            'ext.ark.datamaps.bootstrap',
            // Wiki-provided CSS and JS
            'ext.ark.datamaps.site'
        ] );

        if ( $this->useInlineData && !$this->forVisualEditor ) {
            $this->parserOutput->addModules( [
				'ext.ark.datamaps.inlineloader'
			] );
        }
    }

    public function addMarkerDataInline(): void {
        $processor = new MarkerProcessor( $this->title, $this->data, null );
        $this->parserOutput->setText( $this->parserOutput->getRawText() . Html::element(
            'script',
            [
                'type' => 'application/datamap+json',
                'id' => 'datamap-inline-data-' . $this->getId()
            ],
            FormatJson::encode( $processor->processAll(), false, FormatJson::UTF8_OK )
        ) );
    }

    public function updateLinks(): void {
        // Mix-ins
        if ( $this->data->getMixins() !== null ) {
            foreach ( $this->data->getMixins() as &$mixinName ) {
                $mixin = Title::makeTitleSafe( ExtensionConfig::getNamespaceId(), $mixinName );
                $this->parserOutput->addTemplate( $mixin, $mixin->getArticleId(),
                    $this->parser->fetchCurrentRevisionRecordOfTitle( $mixin )->getId() );
            }
        }

        // Backgrounds
        foreach ( $this->data->getBackgrounds() as &$background ) {
            // Main image
            if ( !$background->hasTiles() ) {
                DataMapFileUtils::registerImageDependency( $this->parserOutput, $background->getImageName() );
            }
            // Tiles
            if ( $background->hasTiles() ) {
                $background->iterateTiles( function ( MapBackgroundTileSpec $spec ) {
                    DataMapFileUtils::registerImageDependency( $this->parserOutput, $spec->getImageName() );
                } );
            }
            // Image overlays
            if ( $background->hasOverlays() ) {
                $background->iterateOverlays( function ( MapBackgroundOverlaySpec $spec ) {
                    if ( $spec->getImageName() != null ) {
                        DataMapFileUtils::registerImageDependency( $this->parserOutput, $spec->getImageName() );
                    }
                } );
            }
        }

        // Groups
        $this->data->iterateGroups( function( MarkerGroupSpec $spec ) {
            // Icon
            if ( $spec->getIcon() !== null ) {
                DataMapFileUtils::registerImageDependency( $this->parserOutput, $spec->getIcon() );
            }
            // Article link
            if ( $spec->getSharedRelatedArticle() !== null ) {
                $this->parserOutput->addLink( Title::newFromText( $spec->getSharedRelatedArticle() ) );
            }
        } );

        // Markers
        $marker = new MarkerSpec( new \stdclass() );
        $this->data->iterateRawMarkerMap( function ( string $layers, array $rawCollection ) use ( &$marker ) {
            foreach ( $rawCollection as &$rawMarker ) {
                $marker->reassignTo( $rawMarker );
                // Popup image
                if ( $marker->getPopupImage() !== null ) {
                    DataMapFileUtils::registerImageDependency( $this->parserOutput, $marker->getPopupImage() );
                }
                // Article link
                if ( $marker->getRelatedArticle() !== null ) {
                    $this->parserOutput->addLink( Title::newFromText( $marker->getRelatedArticle() ) );
                }
            }
        } );
    }

    public function getHtml( EmbedRenderOptions $options ): string {
        // Primary slots
		$containerMain = new \OOUI\PanelLayout( [
            // DEPRECATED(v0.13.0:v0.14.0): replaced with data-datamap-id
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
		$containerBottom = new \OOUI\PanelLayout( [
            'classes' => [ 'datamap-container-bottom' ],
			'framed' => false,
			'expanded' => false,
			'padded' => false
		] );

        // Push page ID onto the container
        $containerMain->setAttributes( [
            'data-datamap-id' => $this->getId()
        ] );

        // Stack the containers
        $containerMain->appendContent( $containerTop );
        $containerMain->appendContent( $containerContent );
        $containerMain->appendContent( $containerBottom );

        // Expose FF_HIDE_LEGEND flag
        if ( $this->data->wantsLegendHidden() ) {
            $containerMain->addClasses( [ 'datamap-legend-is-hidden' ] );
        }

        // Expose FF_SHOW_LEGEND_ABOVE flag
        if ( $this->data->wantsLegendShownAbove() ) {
            $containerMain->addClasses( [ 'datamap-legend-is-above' ] );
        }

        // Set data attribute with filters if they are specified
        if ( $options->displayGroups != null ) {
            $containerMain->setAttributes( [ 'data-filter-groups' => implode( '|', $options->displayGroups ) ] );
        }

        // Legend
        if ( !$this->data->wantsLegendHidden() ) {
            $containerContent->appendContent( $this->getLegendContainerWidget() );
        }

        // Leaflet area
		$containerMap = new \OOUI\PanelLayout( [
			'framed' => true,
			'expanded' => false,
		] );
        $containerMap->appendContent( new \OOUI\HtmlSnippet( $this->getLeafletContainerHtml() ) );
        $containerContent->appendContent( $containerMap );

        // Deliver map configuration via a <script> tag. Prior to v0.13.0 this was delivered via mw.config, but that has the
        // downside of slowing down the page load (config is delivered via head, but not actually used until the script is
        // loaded), and can no longer be done in MW 1.39 without heavily polluting the store.
        // This configuration is used to set up the map before any data sets are downloaded. It allows for environment to be
        // prepared.
        // TODO: possibly deliver some of this stuff via API? tho dunno if there's any real benefits to that
        $config = new EmbedConfigGenerator( $this->title, $this->data, $this->useInlineData, $this->forVisualEditor );
        $containerMain->appendContent( new \OOUI\HtmlSnippet( $config->makeElement() ) );

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
                [
                    'class' => 'datamap-overlay-status'
                ],
                wfMessage( 'datamap-javascript-required' )
            )
            . Html::rawElement(
				'div',
				[
					'class' => 'datamap-status datamap-overlay-status'
				],
				wfMessage( 'datamap-loading-data' )
                . ( new \OOUI\ProgressBarWidget( [
                    'progress' => false
                ] ) )->toString()
			)
		);
    }
}
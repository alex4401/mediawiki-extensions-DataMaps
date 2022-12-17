<?php
namespace MediaWiki\Extension\DataMaps\Rendering;

use FormatJson;
use Html;
use MediaWiki\Extension\DataMaps\Data\DataMapSpec;
use MediaWiki\Extension\DataMaps\Data\MapBackgroundOverlaySpec;
use MediaWiki\Extension\DataMaps\Data\MapBackgroundTileSpec;
use MediaWiki\Extension\DataMaps\Data\MarkerGroupSpec;
use MediaWiki\Extension\DataMaps\Data\MarkerSpec;
use MediaWiki\Extension\DataMaps\ExtensionConfig;
use MediaWiki\Extension\DataMaps\Rendering\Utils\DataMapFileUtils;
use MediaWiki\MediaWikiServices;
use Parser;
use ParserOptions;
use ParserOutput;
use Title;

class EmbedRenderer {
    public DataMapSpec $data;

    private Title $title;
    private bool $useInlineData;
    private bool $forVisualEditor;
    private Parser $parser;
    private ParserOutput $parserOutput;
    private ParserOptions $parserOptions;

    public function __construct( Title $title, DataMapSpec $data, Parser $parser, ParserOutput $parserOutput, array $options = [] ) {
        $this->title = $title;
        $this->data = $data;
        $this->useInlineData = $options['inlineData'] ?? false;
        $this->forVisualEditor = $options['ve'] ?? false;

        $this->parser = MediaWikiServices::getInstance()->getParserFactory()->getInstance();
        $this->parserOutput = $parserOutput;

        $this->parserOptions = ParserOptions::newFromAnon();
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
            // ext.datamaps.leaflet is loaded on demand (when a DataMap is initialised) in a separate request
            // to not delay the site module
            'ext.datamaps.core',
            // Initialiser module to boot the maps
            'ext.datamaps.bootstrap',
            // Wiki-provided CSS and JS
            'ext.datamaps.site'
        ] );

        if ( $this->useInlineData && !$this->forVisualEditor ) {
            $this->parserOutput->addModules( [
                'ext.datamaps.inlineloader'
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
        $this->data->iterateGroups( function ( MarkerGroupSpec $spec ) {
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

    public function getHtml( ?EmbedRenderOptions $options = null ): string {
        // Primary slots
        $containerMain = new \OOUI\PanelLayout( [
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

        // Set data attribute with filters if they are specified
        if ( $options !== null && $options->displayGroups != null ) {
            $containerMain->setAttributes( [ 'data-filter-groups' => implode( '|', $options->displayGroups ) ] );
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
        $config = new EmbedConfigGenerator( $this->title, $this->data, [
            'inlineData' => $this->useInlineData,
            've' => $this->forVisualEditor,
            'layers' => $options && $options->displayGroups || null
        ] );
        $containerMain->appendContent( new \OOUI\HtmlSnippet( $config->makeElement() ) );

        return $containerMain;
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

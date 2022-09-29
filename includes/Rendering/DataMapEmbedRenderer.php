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
use MediaWiki\Extension\Ark\DataMaps\Rendering\Utils\DataMapColourUtils;
use MediaWiki\Extension\Ark\DataMaps\Rendering\Utils\DataMapFileUtils;

class DataMapEmbedRenderer {
    const MARKER_ICON_WIDTH = MarkerGroupSpec::DEFAULT_ICON_SIZE[0];
    const LEGEND_ICON_WIDTH = 24;

    public DataMapSpec $data;

    private Title $title;
    private bool $useInlineData;
    private Parser $parser;
    private ParserOptions $parserOptions;

    public function __construct( Title $title, DataMapSpec $data, Parser $parser, bool $useInlineData = false ) {
        $this->title = $title;
        $this->data = $data;
        $this->useInlineData = $useInlineData;

        $this->parser = $parser->getFreshParser();

        $this->parserOptions = ParserOptions::newCanonical( 'canonical' );
        $this->parserOptions->enableLimitReport( false );
        $this->parserOptions->setAllowSpecialInclusion( false );
        $this->parserOptions->setExpensiveParserFunctionLimit( 4 );
        $this->parserOptions->setInterwikiMagic( false );
        $this->parserOptions->setMaxIncludeSize( 800 );        
        $this->parserOptions->setCurrentRevisionRecordCallback( $parser->getOptions()->getCurrentRevisionRecordCallback() );

        $this->parser->setOptions( $this->parserOptions );
    }

    public function getId(): int {
        return $this->title->getArticleID();
    }

    public function prepareOutput( ParserOutput $parserOutput ) {
        // Enable and configure OOUI
        $parserOutput->setEnableOOUI( true );
		\OOUI\Theme::setSingleton( new \OOUI\WikimediaUITheme() );
		\OOUI\Element::setDefaultDir( 'ltr' );

        // Required modules
        $parserOutput->addModules( [
            'ext.ark.datamaps.styles',
            // ext.ark.datamaps.leaflet.core is loaded on demand (when a DataMap is initialised) in a separate request
            // to not delay the site module
            'ext.ark.datamaps.core',
            // Initialiser module to boot the maps
            'ext.ark.datamaps.bootstrap',
            // Wiki-provided CSS and JS
            'ext.ark.datamaps.site'
        ] );

        if ( $this->useInlineData ) {
            $parserOutput->addModules( [
				'ext.ark.datamaps.inlineloader'
			] );
            $processor = new MarkerProcessor( $this->title, $this->data, null );
            $parserOutput->setText( $parserOutput->getRawText() . Html::element(
                'script',
                [
                    'type' => 'application/json+datamap',
                    'id' => 'datamap-inline-data-' . $this->getId()
                ],
                FormatJson::encode( $processor->processAll(), false, FormatJson::UTF8_OK )
            ) );
        }

        if ( !ExtensionConfig::isBleedingEdge() ) {
            // Inject mw.config variables via a `dataMaps` map from ID
            $configsVar = [
                $this->getId() => $this->getJsConfigVariables()
            ];
            if ( array_key_exists( 'dataMaps', $parserOutput->mJsConfigVars ) ) {
                $configsVar += $parserOutput->mJsConfigVars['dataMaps'];
            }
            $parserOutput->addJsConfigVars( 'dataMaps', $configsVar );
        }

        // Update image and page links tables
        $this->registerDependencies( $parserOutput );
    }

    public function registerDependencies( ParserOutput $parserOutput ): void {
        // Mix-ins
        if ( $this->data->getMixins() !== null ) {
            foreach ( $this->data->getMixins() as &$mixinName ) {
                $mixin = Title::makeTitleSafe( ExtensionConfig::getNamespaceId(), $mixinName );
                $parserOutput->addTemplate( $mixin, $mixin->getArticleId(),
                    $this->parser->fetchCurrentRevisionRecordOfTitle( $mixin )->getId() );
            }
        }

        // Backgrounds
        foreach ( $this->data->getBackgrounds() as &$background ) {
            // Main image
            DataMapFileUtils::registerImageDependency( $parserOutput, $background->getImageName() );
            // Image overlays
            if ( $background->hasOverlays() ) {
                $background->iterateOverlays( function ( MapBackgroundOverlaySpec $spec ) use ( &$parserOutput ) {
                    if ( $spec->getImageName() != null ) {
                        DataMapFileUtils::registerImageDependency( $parserOutput, $spec->getImageName() );
                    }
                } );
            }
        }

        // Groups
        $this->data->iterateGroups( function( MarkerGroupSpec $spec ) use ( &$parserOutput ) {
            // Icon
            if ( $spec->getIcon() !== null ) {
                DataMapFileUtils::registerImageDependency( $parserOutput, $spec->getIcon() );
            }
            // Article link
            if ( $spec->getSharedRelatedArticle() !== null ) {
                $parserOutput->addLink( Title::newFromText( $spec->getSharedRelatedArticle() ) );
            }
        } );

        // Markers
        $marker = new MarkerSpec( new \stdclass() );
        $this->data->iterateRawMarkerMap( function ( string $layers, array $rawCollection ) use ( &$marker, &$parserOutput ) {
            foreach ( $rawCollection as &$rawMarker ) {
                $marker->reassignTo( $rawMarker );
                // Popup image
                if ( $marker->getPopupImage() !== null ) {
                    DataMapFileUtils::registerImageDependency( $parserOutput, $marker->getPopupImage() );
                }
                // Article link
                if ( $marker->getRelatedArticle() !== null ) {
                    $parserOutput->addLink( Title::newFromText( $marker->getRelatedArticle() ) );
                }
            }
        } );
    }

    public function getConfigElement(): string {
        return Html::element(
            'script',
            [
                'type' => 'application/json+datamap'
            ],
            FormatJson::encode( $this->getJsConfigVariables(), false, FormatJson::UTF8_OK )
        );
    }

    public function getJsConfigVariables(): array {
        $out = [];

        // Required to query the API for marker clusters
        if ( !$this->useInlineData ) {
            $out['pageName'] = $this->title->getPrefixedText();
            $out['version'] = $this->title->getLatestRevID();
        }
        // Coordinate transformation
        if ( $this->data->getCoordinateReferenceSpace() != DataMapSpec::DEFAULT_COORDINATE_SPACE ) {
            $out['crs'] = $this->data->getCoordinateReferenceSpace();
        }
        // Feature management
        $bitmask = $this->getPublicFeatureBitMask();
        if ( $bitmask != 0 ) {
            $out['flags'] = $bitmask;
        }
        // Backgrounds
        $out['backgrounds'] = array_map( function ( MapBackgroundSpec $background ) {
            $image = DataMapFileUtils::getRequiredFile( $background->getImageName() );

            $out = [];
            $out['image'] = $image->getURL();
            if ( $background->getName() != null ) {
                $out['name'] = $background->getName();
            }
            if ( $background->getPlacementLocation() != null ) {
                $out['at'] = $background->getPlacementLocation();
            }
            if ( $background->getBackgroundLayerName() !== null ) {
                $out['layer'] = $background->getBackgroundLayerName();
            }
            if ( $background->hasOverlays() ) {
                $out['overlays'] = [];
                $background->iterateOverlays( function ( MapBackgroundOverlaySpec $overlay ) use ( &$out ) {
                    $out['overlays'][] = $this->convertBackgroundOverlay( $overlay );
                } );
            }

            return $out;
        }, $this->data->getBackgrounds() );
        // Marker groups
        $out['groups'] = [];
        $this->data->iterateGroups( function ( MarkerGroupSpec $spec ) use ( &$out ) {
            $out['groups'][$spec->getId()] = $this->getMarkerGroupConfig( $spec );
        } );
        // Marker layers
        $out['layers'] = [];
        $out['layerIds'] = $this->data->getLayerNames();
        $this->data->iterateDefinedLayers( function ( MarkerLayerSpec $spec ) use ( &$out ) {
            $out['layers'][$spec->getId()] = $this->getMarkerLayerConfig( $spec );
        } );
        // Settings and extensions
        if ( $this->data->getInjectedLeafletSettings() != null ) {
            $out['leafletSettings'] = $this->data->getInjectedLeafletSettings();
        }
        if ( $this->data->getCustomData() != null ) {
            $out['custom'] = $this->data->getCustomData();
        }

        return $out;
    }

    public function getPublicFeatureBitMask(): int {
        $out = 0;
        $out |= $this->data->wantsCoordinatesShown() ? 1<<0 : 0;
        $out |= $this->data->wantsLegendHidden() ? 1<<1 : 0;
        $out |= $this->data->wantsZoomDisabled() ? 1<<2 : 0;
        $out |= $this->data->wantsSearch() ? 1<<3 : 0;
        $out |= $this->data->wantsChecklistSortedByAmount() ? 1<<4 : 0;
        return $out;
    }

    private function convertBackgroundOverlay( MapBackgroundOverlaySpec $spec ) {
        $result = [];
        if ( $spec->getName() != null ) {
            $result['name'] = $spec->getName();
        }
        if ( $spec->getImageName() != null ) {
            $image = DataMapFileUtils::getRequiredFile( $spec->getImageName() );
            $result['image'] = $image->getURL();
        }
        if ( $spec->getPath() != null ) {
            $result['path'] = $spec->getPath();
        } else {
            $result['at'] = $spec->getPlacementLocation();
        }

        if ( $spec->supportsDrawProperties() ) {
            if ( $spec->getRawFillColour() !== null ) {
                $result['colour'] = DataMapColourUtils::asHex( $spec->getFillColour() );
            }
            if ( $spec->getPolylineThickness() !== null ) {
                $result['thickness'] = $spec->getPolylineThickness();
            }
            if ( $spec->getRawRectStrokeColour() !== null ) {
                $result['strokeColour'] = DataMapColourUtils::asHex( $spec->getRectStrokeColour() );
            }
        }

        return $result;
    }

    public function getPublicGroupFeatureBitMask( MarkerGroupSpec $spec ): int {
        $out = 0;
        $out |= $spec->wantsChecklistNumbering() ? 1<<0 : 0;
        $out |= !$spec->isIncludedInSearch() ? 1<<1 : 0;
        $out |= !$spec->isDefault() ? 1<<2 : 0;
        switch ( $spec->getCollectibleMode() ) {
            case MarkerGroupSpec::CM_INDIVIDUAL:
                $out |= 1<<3;
                break;
            case MarkerGroupSpec::CM_AS_ONE:
                $out |= 1<<4;
                break;
            case MarkerGroupSpec::CM_AS_ONE_GLOBAL:
                $out |= 1<<5;
                break;
        }
        return $out;
    }

    public function getMarkerGroupConfig( MarkerGroupSpec $spec ): array {
        $out = array(
            'name' => $spec->getName(),
            'size' => $spec->getSize(),
        );

        $flags = $this->getPublicGroupFeatureBitMask( $spec );
        if ( $flags !== 0 ) {
            $out['flags'] = $flags;
        }

        switch ( $spec->getDisplayMode() ) {
            case MarkerGroupSpec::DM_CIRCLE:
                $out['fillColor'] = DataMapColourUtils::asHex( $spec->getFillColour() );

                if ( $spec->getRawStrokeColour() != null ) {
                    $out['strokeColor'] = DataMapColourUtils::asHex( $spec->getStrokeColour() );
                }

                if ( $spec->getStrokeWidth() != MarkerGroupSpec::DEFAULT_CIRCLE_STROKE_WIDTH ) {
                    $out['strokeWidth'] = $spec->getStrokeWidth();
                }

                if ( $spec->getExtraMinZoomSize() != null ) {
                    $out['extraMinZoomSize'] = $spec->getExtraMinZoomSize();
                }
                break;
            case MarkerGroupSpec::DM_ICON:
                // Upsize by 50% to mitigate quality loss at max zoom
                $size = floor($out['size'][0] * 1.5);
                // Ensure it's a multiple of 2
                if ( $size % 2 !== 0 ) {
                    $size++;
                }
                $out['markerIcon'] = DataMapFileUtils::getFileUrl( $spec->getIcon(), $size );
                break;
            default:
                throw new InvalidArgumentException( wfMessage( 'datamap-error-render-unsupported-displaymode', $spec->getDisplayMode() ) );
        }

        if ( $spec->getIcon() !== null ) {
            $out['legendIcon'] = DataMapFileUtils::getFileUrl( $spec->getIcon(), self::LEGEND_ICON_WIDTH );
        }

        if ( $spec->getSharedRelatedArticle() !== null ) {
            $out['article'] = $spec->getSharedRelatedArticle();
        }

        if ( $spec->getCollectibleMode() !== null ) {
            $out['collectible'] = $spec->getCollectibleMode();
        }

        return $out;
    }

    public function getMarkerLayerConfig( MarkerLayerSpec $spec ): array {
        $out = [];

        if ( $spec->getName() !== null ) {
            $out['name'] = $spec->getName();
        }

        if ( $spec->getPopupDiscriminator() !== null ) {
            $out['discrim'] = $spec->getPopupDiscriminator();
        }

        if ( $spec->getIconOverride() !== null ) {
            // Upsize by 50% to mitigate quality loss at max zoom
            $size = floor($out['size'][0] * 1.5);
            // Ensure it's a multiple of 2
            if ( $size % 2 !== 0 ) {
                $size++;
            }
            $out['markerIcon'] = DataMapFileUtils::getFileUrl( $spec->getIconOverride(), $size );
        }

        return $out;
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
		$containerBottom = new \OOUI\PanelLayout( [
            'classes' => [ 'datamap-container-bottom' ],
			'framed' => false,
			'expanded' => false,
			'padded' => false
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

        // Deliver map configuration via a <script> tag. Prior to v0.12.0 this was delivered via mw.config, but that has the
        // downside of slowing down the page load (config is delivered via head, but not actually used until the script is
        // loaded), and can no longer be done in MW 1.39 without heavily polluting the store.
        // This configuration is used to set up the map before any data sets are downloaded. It allows for environment to be
        // prepared.
        // TODO: possibly deliver some of this stuff via API? tho dunno if there's any real benefits to that
        // TODO: unlock for v0.12.x release or AT LAST v0.13.x when confirmed stable
        if ( ExtensionConfig::isBleedingEdge() ) {
            $containerMain->appendContent( new \OOUI\HtmlSnippet( $this->getConfigElement() ) );
        }

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
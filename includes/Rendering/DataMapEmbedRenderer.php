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

use MediaWiki\Extension\Ark\DataMaps\Data\DataMapSpec;
use MediaWiki\Extension\Ark\DataMaps\Data\MarkerGroupSpec;
use MediaWiki\Extension\Ark\DataMaps\Data\MarkerLayerSpec;
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
            'ext.ark.datamaps.bootstrap'
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

        // Inject mw.config variables via a `dataMaps` map from ID
        $configsVar = [
            $this->getId() => $this->getJsConfigVariables()
        ];
        if ( array_key_exists( 'dataMaps', $parserOutput->mJsConfigVars ) ) {
            $configsVar += $parserOutput->mJsConfigVars['dataMaps'];
        }
        $parserOutput->addJsConfigVars( 'dataMaps', $configsVar );

        // Register image dependencies
        foreach ( $this->data->getBackgrounds() as &$background ) {
            $parserOutput->addImage( $background->getImageName() );
        }
        $this->data->iterateGroups( function( MarkerGroupSpec $spec ) use ( &$parserOutput ) {
            $parserOutput->addImage( $spec->getIcon() );
        } );
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
        if ( $this->data->wantsCoordinatesShown() ) {
            $out |= 1<<0;
        }
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

    public function getMarkerGroupConfig( MarkerGroupSpec $spec ): array {
        $out = array(
            'name' => $spec->getName(),
            'size' => $spec->getSize(),
        );

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

        if ( $spec->canDismiss() ) {
            $out['canDismiss'] = $spec->canDismiss();
        }

        return $out;
    }

    public function getMarkerLayerConfig( MarkerLayerSpec $spec ): array {
        $out = [];
        $out['name'] = $spec->getName();

        if ( $spec->getPopupDiscriminator() !== null ) {
            $out['discrim'] = $spec->getPopupDiscriminator();
        }

        return $out;
    }

    private function expandWikitext( string $source ): string {
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

        // Expose FF_SHOW_LEGEND_ABOVE flag
        if ( $this->data->wantsLegendShownAbove() ) {
            $containerMain->addClasses( [ 'datamap-legend-is-above' ] );
        }

        // Set data attribute with filters if they are specified
        if ( $options->displayGroups != null ) {
            $containerMain->setAttributes( [ 'data-filter-groups' => implode( '|', $options->displayGroups ) ] );
        }

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
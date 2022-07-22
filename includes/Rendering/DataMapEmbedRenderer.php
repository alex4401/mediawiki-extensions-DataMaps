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

use MediaWiki\Extension\Ark\DataMaps\Data\DataMapSpec;
use MediaWiki\Extension\Ark\DataMaps\Data\DataMapGroupSpec;
use MediaWiki\Extension\Ark\DataMaps\Data\DataMapBackgroundSpec;
use MediaWiki\Extension\Ark\DataMaps\Data\DataMapBackgroundOverlaySpec;
use MediaWiki\Extension\Ark\DataMaps\Rendering\Utils\DataMapColourUtils;
use MediaWiki\Extension\Ark\DataMaps\Rendering\Utils\DataMapFileUtils;

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
            // ext.ark.datamaps.leaflet.core is loaded on demand by the loader in a separate request to not slow down site module
            'ext.ark.datamaps.loader'
        ] );

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
        $this->data->iterateGroups( function( DataMapGroupSpec $spec ) use ( &$parserOutput ) {
            $parserOutput->addImage( $spec->getIcon() );
        } );
    }

    public function getJsConfigVariables(): array {
        $out = [
            // Required to query the API for marker clusters
            'pageName' => $this->title->getPrefixedText(),
            'version' => $this->title->getLatestRevID(),

            'backgrounds' => array_map( function ( DataMapBackgroundSpec $background ) {
                $image = DataMapFileUtils::getRequiredFile( $background->getImageName() );
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

                if ( $background->hasOverlays() ) {
                    $out['overlays'] = [];
                    $background->iterateOverlays( function ( DataMapBackgroundOverlaySpec $overlay ) use ( &$out ) {
                        $result = [ 'at' => $overlay->getPlacementLocation() ];
                        if ( $overlay->getName() != null ) {
                            $result['name'] = $overlay->getName();
                        }
                        $out['overlays'][] = $result;
                    } );
                }

                return $out;
            }, $this->data->getBackgrounds() ),
            
            'groups' => [],
            'layers' => [],
            'layerIds' => $this->data->getLayerNames(),

            'custom' => $this->data->getCustomData()
        ];

        $this->data->iterateGroups( function( DataMapGroupSpec $spec ) use ( &$out ) {
            $out['groups'][$spec->getId()] = $this->getMarkerGroupConfig( $spec );
        } );

        if ( $this->data->getInjectedLeafletSettings() ) {
            $out['leafletSettings'] = $this->data->getInjectedLeafletSettings();
        }

        return $out;
    }

    public function getMarkerGroupConfig( DataMapGroupSpec $spec ): array {
        $out = array(
            'name' => $spec->getName(),
            'size' => $spec->getSize(),
        );

        switch ( $spec->getDisplayMode() ) {
            case DataMapGroupSpec::DM_CIRCLE:
                $out['fillColor'] = DataMapColourUtils::asHex( $spec->getFillColour() );

                if ( $spec->getRawStrokeColour() != null ) {
                    $out['strokeColor'] = DataMapColourUtils::asHex( $spec->getStrokeColour() );
                }

                if ( $spec->getStrokeWidth() != DataMapGroupSpec::DEFAULT_CIRCLE_STROKE_WIDTH ) {
                    $out['strokeWidth'] = $spec->getStrokeWidth();
                }

                if ( $spec->getExtraMinZoomSize() != null ) {
                    $out['extraMinZoomSize'] = $spec->getExtraMinZoomSize();
                }
                break;
            case DataMapGroupSpec::DM_ICON:
                // Upsize by 50% to mitigate quality loss at max zoom
                $size = floor(self::MARKER_ICON_WIDTH * 1.5);
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
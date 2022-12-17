<?php
namespace MediaWiki\Extension\DataMaps\Rendering;

use FormatJson;
use Html;
use InvalidArgumentException;
use MediaWiki\Extension\DataMaps\Data\DataMapSpec;
use MediaWiki\Extension\DataMaps\Data\MapBackgroundOverlaySpec;
use MediaWiki\Extension\DataMaps\Data\MapBackgroundSpec;
use MediaWiki\Extension\DataMaps\Data\MapBackgroundTileSpec;
use MediaWiki\Extension\DataMaps\Data\MarkerGroupSpec;
use MediaWiki\Extension\DataMaps\Data\MarkerLayerSpec;
use MediaWiki\Extension\DataMaps\Rendering\Utils\DataMapColourUtils;
use MediaWiki\Extension\DataMaps\Rendering\Utils\DataMapFileUtils;
use Title;

class EmbedConfigGenerator {
    public const MARKER_ICON_WIDTH = MarkerGroupSpec::DEFAULT_ICON_SIZE[0];
    public const LEGEND_ICON_WIDTH = 24;
    public const NUMBER_OF_MARKERS_FOR_CANVAS = 500;

    public DataMapSpec $data;
    private Title $title;
    private bool $useInlineData;
    private bool $forVisualEditor;
    private ?array $requireLayers;

    public function __construct( Title $title, DataMapSpec $data, array $options ) {
        $this->title = $title;
        $this->data = $data;
        $this->useInlineData = $options['inlineData'] ?? false;
        $this->forVisualEditor = $options['ve'] ?? false;

        $this->requireLayers = null;
        if ( is_array( $options['layers'] ) && count ( $options['layers'] ) > 0 ) {
            $this->requireLayers = $options['layers'];
        }
    }

    public function getId(): int {
        return $this->title->getArticleID();
    }

    public function makeElement(): string {
        return Html::element(
            'script',
            [
                'type' => 'application/datamap+json'
            ],
            FormatJson::encode( $this->makeArray(), false, FormatJson::UTF8_OK )
        );
    }

    public function makeArray(): array {
        $out = [];

        // Required to query the API for marker clusters
        if ( !$this->useInlineData && !$this->forVisualEditor ) {
            $out['version'] = $this->title->getLatestRevID();
        }
        $out['cOrder'] = $coordOrder = $this->data->getCoordinateOrder();
        // Coordinate transformation
        if ( $this->data->getCoordinateReferenceSpace() != DataMapSpec::DEFAULT_COORDINATE_SPACE ) {
            $out['crs'] = DataMapSpec::normaliseBoxCoordinates( $this->data->getCoordinateReferenceSpace(), $coordOrder );
        }
        // Feature management
        $bitmask = $this->getPublicFeatureBitMask();
        if ( $bitmask != 0 ) {
            $out['flags'] = $bitmask;
        }
        // Backgrounds
        $out['backgrounds'] = array_map( function ( MapBackgroundSpec $spec ) use ( $coordOrder ) {
            return $this->getBackgroundConfig( $spec, $coordOrder );
        }, $this->data->getBackgrounds() );
        // Marker groups
        $out['groups'] = [];
        $this->data->iterateGroups( function ( MarkerGroupSpec $spec ) use ( &$out ) {
            if ( $this->requireLayers && !in_array( $spec->getId(), $this->requireLayers ) ) {
                return;
            }

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
        $out |= $this->data->wantsCoordinatesShown() ? 1 << 0 : 0;
        $out |= $this->data->wantsLegendHidden() ? 1 << 1 : 0;
        $out |= $this->data->wantsZoomDisabled() ? 1 << 2 : 0;
        $out |= $this->data->wantsSearch() ? 1 << 3 : 0;
        $out |= $this->data->wantsChecklistSortedByAmount() ? 1 << 4 : 0;
        $out |= $this->data->wantsSearch() === DataMapSpec::SM_TABBER ? 1 << 5 : 0;
        $out |= $this->forVisualEditor ? 1 << 6 : 0;
        $out |= ( $this->useInlineData || $this->forVisualEditor ) ? 1 << 7 : 0;

        $markerCount = 0;
        $this->data->iterateRawMarkerMap( static function ( string $_, array $rawCollection ) use ( &$markerCount ) {
            $markerCount += count( $rawCollection );
        } );
        $out |= $markerCount >= self::NUMBER_OF_MARKERS_FOR_CANVAS ? 1 << 8 : 0;

        return $out;
    }

    private function getBackgroundConfig( MapBackgroundSpec $spec, int $coordOrder ): array {
        $out = [];
        if ( !$spec->hasTiles() ) {
            $out['image'] = DataMapFileUtils::getRequiredFile( $spec->getImageName() )->getURL();
        }
        if ( $spec->getName() != null ) {
            $out['name'] = $spec->getName();
        }
        if ( $spec->getPlacementLocation() != null ) {
            $out['at'] = DataMapSpec::normaliseBoxCoordinates( $spec->getPlacementLocation(), $coordOrder );
        }
        if ( $spec->getBackgroundLayerName() !== null ) {
            $out['layer'] = $spec->getBackgroundLayerName();
        }
        if ( $spec->hasOverlays() || $spec->hasTiles() ) {
            $out['overlays'] = [];
        }
        if ( $spec->hasTiles() ) {
            // Anti-aliasing opt-in used by the frontend
            $out['aa'] = 1;
            // Translate all tiles into overlays
            $tileOffset = DataMapSpec::normalisePointCoordinates( $spec->getTilePlacementOffset() ?? [ 0, 0 ], $coordOrder );
            $tileSize = DataMapSpec::normalisePointCoordinates( $spec->getTileSize(), $coordOrder );
            $spec->iterateTiles( function ( MapBackgroundTileSpec $tile ) use ( &$out, &$tileOffset, &$tileSize, $coordOrder ) {
                $out['overlays'][] = $this->convertBackgroundTile( $tile, $tileOffset, $tileSize, $coordOrder );
            } );
        }
        if ( $spec->hasOverlays() ) {
            $spec->iterateOverlays( function ( MapBackgroundOverlaySpec $overlay ) use ( &$out, $coordOrder ) {
                $out['overlays'][] = $this->convertBackgroundOverlay( $overlay, $coordOrder );
            } );
        }

        return $out;
    }

    private function convertBackgroundOverlay( MapBackgroundOverlaySpec $spec, int $coordOrder ) {
        $result = [];
        if ( $spec->getName() != null ) {
            $result['name'] = $spec->getName();
        }
        if ( $spec->getImageName() != null ) {
            $image = DataMapFileUtils::getRequiredFile( $spec->getImageName() );
            $result['image'] = $image->getURL();

            if ( $spec->wantsImageGapWorkaround() ) {
                $result['aa'] = 1;
            }
        }
        if ( $spec->getPath() != null ) {
            $result['path'] = $spec->getPath();
        } else {
            $result['at'] = DataMapSpec::normaliseBoxCoordinates( $spec->getPlacementLocation(), $coordOrder );
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

    private function convertBackgroundTile( MapBackgroundTileSpec $spec, array $tileOffset, array $tileSize, int $coordOrder ) {
        $result = [];

        $at = DataMapSpec::normalisePointCoordinates( $spec->getPlacementLocation(), $coordOrder );
        $at = [
            [ $at[0] * $tileSize[0] + $tileOffset[0], $at[1] * $tileSize[1] + $tileOffset[1] ],
            [ ( $at[0] + 1 ) * $tileSize[0] + $tileOffset[0], ( $at[1] + 1 ) * $tileSize[1] + $tileOffset[1] ]
        ];

        $result['image'] = DataMapFileUtils::getRequiredFile( $spec->getImageName() )->getURL();
        $result['at'] = $at;
        return $result;
    }

    public function getPublicGroupFeatureBitMask( MarkerGroupSpec $spec ): int {
        $out = 0;
        $out |= $spec->wantsChecklistNumbering() ? 1 << 0 : 0;
        $out |= !$spec->isIncludedInSearch() ? 1 << 1 : 0;
        $out |= !$spec->isDefault() ? 1 << 2 : 0;
        switch ( $spec->getCollectibleMode() ) {
            case MarkerGroupSpec::CM_INDIVIDUAL:
                $out |= 1 << 3;
                break;
            case MarkerGroupSpec::CM_AS_ONE:
                $out |= 1 << 4;
                break;
            case MarkerGroupSpec::CM_AS_ONE_GLOBAL:
                $out |= 1 << 5;
                break;
        }
        return $out;
    }

    public function getMarkerGroupConfig( MarkerGroupSpec $spec ): array {
        $out = [
            'name' => $spec->getName(),
            'size' => $spec->getSize(),
        ];

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
                $size = floor( $out['size'][0] * 1.5 );
                // Ensure it's a multiple of 2
                if ( $size % 2 !== 0 ) {
                    $size++;
                }
                $out['markerIcon'] = DataMapFileUtils::getFileUrl( $spec->getIcon(), $size );
                break;
            case MarkerGroupSpec::DM_PIN:
                $out['pinColor'] = DataMapColourUtils::asHex( $spec->getPinColour() );
                break;
            default:
                throw new InvalidArgumentException( wfMessage( 'datamap-error-render-unsupported-displaymode',
                    $spec->getDisplayMode() ) );
        }

        if ( $spec->getIcon() !== null ) {
            $out['legendIcon'] = DataMapFileUtils::getFileUrl( $spec->getIcon(), self::LEGEND_ICON_WIDTH );
        }

        if ( $spec->getSharedRelatedArticle() !== null ) {
            $out['article'] = $spec->getSharedRelatedArticle();
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
            $size = floor( $out['size'][0] * 1.5 );
            // Ensure it's a multiple of 2
            if ( $size % 2 !== 0 ) {
                $size++;
            }
            $out['markerIcon'] = DataMapFileUtils::getFileUrl( $spec->getIconOverride(), $size );
        }

        return $out;
    }
}

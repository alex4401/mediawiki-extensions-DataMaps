<?php
namespace MediaWiki\Extension\Ark\DataMaps\Rendering;

use MediaWiki\MediaWikiServices;
use Title;
use OutputPage;
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

class EmbedConfigGenerator {
    const MARKER_ICON_WIDTH = MarkerGroupSpec::DEFAULT_ICON_SIZE[0];
    const LEGEND_ICON_WIDTH = 24;

    public DataMapSpec $data;
    private Title $title;
    private bool $useInlineData;

    public function __construct( Title $title, DataMapSpec $data, bool $useInlineData = false ) {
        $this->title = $title;
        $this->data = $data;
        $this->useInlineData = $useInlineData;
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
        if ( !$this->useInlineData ) {
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
        $out['backgrounds'] = array_map( function ( MapBackgroundSpec $spec ) {
            return $this->getBackgroundConfig( $spec );
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
        $out |= $this->data->wantsSearch() === DataMapSpec::SM_TABBER ? 1<<5 : 0;
        return $out;
    }

    private function getBackgroundConfig( MapBackgroundSpec $spec ): array {
        $out = [];
        if ( !$spec->hasTiles() ) {
            $out['image'] = DataMapFileUtils::getRequiredFile( $spec->getImageName() )->getURL();
        }
        if ( $spec->getName() != null ) {
            $out['name'] = $spec->getName();
        }
        if ( $spec->getPlacementLocation() != null ) {
            $out['at'] = $spec->getPlacementLocation();
        }
        if ( $spec->getBackgroundLayerName() !== null ) {
            $out['layer'] = $spec->getBackgroundLayerName();
        }
        if ( $spec->hasOverlays() || $spec->hasTiles() ) {
            $out['overlays'] = [];
        }
        if ( $spec->hasTiles() ) {
            // Unused field corresponding to Leaflet.ImageOverlay.options.antiAliasing, this may be used by the frontend
            // in future.
            $out['aa'] = 0.5;
            // Translate all tiles into overlays
            $tileSize = $spec->getTileSize();
            $spec->iterateTiles( function ( MapBackgroundTileSpec $tile ) use ( &$out, $tileSize ) {
                $out['overlays'][] = $this->convertBackgroundTile( $tile, $tileSize );
            } );
        }
        if ( $spec->hasOverlays() ) {
            $spec->iterateOverlays( function ( MapBackgroundOverlaySpec $overlay ) use ( &$out ) {
                $out['overlays'][] = $this->convertBackgroundOverlay( $overlay );
            } );
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

    private function convertBackgroundTile( MapBackgroundTileSpec $spec, array $tileSize ) {
        $result = [];

        $at = $spec->getPlacementLocation();
        $at = [
            [ $at[0] * $tileSize[0], $at[1] * $tileSize[1] ],
            [ ( $at[0] + 1 ) * $tileSize[0], ( $at[1] + 1 ) * $tileSize[1] ]
        ];

        $result['image'] = DataMapFileUtils::getRequiredFile( $spec->getImageName() )->getURL();
        $result['at'] = $at;
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
                $size = floor( $out['size'][0] * 1.5 );
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
}
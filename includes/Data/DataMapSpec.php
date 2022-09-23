<?php
namespace MediaWiki\Extension\Ark\DataMaps\Data;

use Status;
use Title;
use MediaWiki\Extension\Ark\DataMaps\DataMapsConfig;
use MediaWiki\Extension\Ark\DataMaps\Content\DataMapContent;

class DataMapSpec extends DataModel {
    protected static string $publicName = 'DataMapSpec';

    const DEFAULT_COORDINATE_SPACE = [ [ 0, 0 ], [ 100, 100 ] ];

    private ?array $cachedMarkerGroups = null;
    private ?array $cachedMarkerLayers = null;
    private ?array $cachedBackgrounds = null;

    public static function staticIsMixin( \stdclass $raw ): bool {
        return isset( $raw->{'$mixin'} ) ? $raw->{'$mixin'} : false;
    }

    public function isMixin(): bool {
        return self::staticIsMixin( $this->raw );
    }

    public function getMixins(): ?array {
        return isset( $this->raw->mixins ) ? $this->raw->mixins : null;
    }

    public function getCoordinateReferenceSpace(): array {
        return isset( $this->raw->crs ) ? $this->raw->crs : self::DEFAULT_COORDINATE_SPACE;
    }

    public function getBackgrounds(): array {
        if ( $this->cachedBackgrounds == null ) {
            if ( !isset( $this->raw->backgrounds ) ) {
                $this->cachedBackgrounds = [ MapBackgroundSpec::fromImageName( $this->raw->image ) ];
            } else {
                $this->cachedBackgrounds = array_map( fn ( $raw ) => new MapBackgroundSpec( $raw ), $this->raw->backgrounds );
            }
        }
        return $this->cachedBackgrounds;
    }

    public function wantsCoordinatesShown(): bool {
        return isset( $this->raw->showCoordinates ) ? $this->raw->showCoordinates
            : DataMapsConfig::getDefaultFeatureState( DataMapsConfig::FF_SHOW_COORDINATES );
    }

    public function wantsLegendHidden(): bool {
        return isset( $this->raw->hideLegend ) ? $this->raw->hideLegend : false;
    }

    public function wantsLegendShownAbove(): bool {
        return isset( $this->raw->showLegendAbove ) ? $this->raw->showLegendAbove
            : DataMapsConfig::getDefaultFeatureState( DataMapsConfig::FF_SHOW_LEGEND_ABOVE );
    }

    public function wantsZoomDisabled(): bool {
        return isset( $this->raw->disableZoom ) ? $this->raw->disableZoom : false;
    }

    public function wantsCustomMarkerIDs(): bool {
        return isset( $this->raw->requireCustomMarkerIDs ) ? $this->raw->requireCustomMarkerIDs
            : DataMapsConfig::getDefaultFeatureState( DataMapsConfig::FF_REQUIRE_CUSTOM_MARKER_IDS );
    }

    public function wantsSearch(): bool {
        return isset( $this->raw->enableSearch ) ? $this->raw->enableSearch
            : DataMapsConfig::getDefaultFeatureState( DataMapsConfig::FF_SEARCH );
    }

    public function wantsChecklistSortedByAmount(): bool {
        return isset( $this->raw->sortChecklistsByAmount ) ? $this->raw->sortChecklistsByAmount
            : DataMapsConfig::getDefaultFeatureState( DataMapsConfig::FF_SORT_CHECKLIST_BY_AMOUNT );
    }

    public function getInjectedLeafletSettings(): ?object {
        return isset( $this->raw->leafletSettings ) ? $this->raw->leafletSettings : null;
    }

    public function getCustomData(): ?object {
        return isset( $this->raw->custom ) ? $this->raw->custom : null;
    }

    public function getRawMarkerMap(): object {
        return isset( $this->raw->markers ) ? $this->raw->markers : new \stdclass();
    }

    public function getRawMarkerGroupMap(): object {
        return $this->raw->groups;
    }

    public function getRawMarkerLayerMap(): object {
        return $this->raw->layers;
    }

    private function warmUpUsedMarkerTypes() {
        $groups = array();
        $specifiers = array();
        foreach ( array_keys( get_object_vars( $this->raw->markers ) ) as &$name ) {
            $parts = explode( ' ', $name );
            $groups[] = array_shift( $parts );
            $specifiers = array_merge( $parts, $specifiers );
        }
        $this->cachedMarkerGroups = array_unique( $groups );
        $this->cachedMarkerLayers = array_values( array_unique( $specifiers ) );
    }

    public function getGroupNames(): array {
        if ( $this->cachedMarkerGroups == null ) {
            $this->warmUpUsedMarkerTypes();
        }
        return $this->cachedMarkerGroups;
    }

    public function getLayerNames(): array {
        if ( $this->cachedMarkerLayers == null ) {
            $this->warmUpUsedMarkerTypes();
        }
        return $this->cachedMarkerLayers;
    }

    public function getGroup( string $name ): MarkerGroupSpec {
        return new MarkerGroupSpec( $name, $this->raw->groups->$name );
    }

    public function hasLayer( string $name ): bool {
        return isset( $this->raw->layers->$name );
    }

    public function getLayer( string $name ): ?MarkerLayerSpec {
        return isset( $this->raw->layers ) ? (
            isset( $this->raw->layers->$name ) ? new MarkerLayerSpec( $name, $this->raw->layers->$name ) : null
        ) : null;
    }

    public function iterateGroups( callable $callback ) {
        foreach ( $this->getGroupNames() as &$name ) {
            $data = $this->getGroup( $name );
            $callback( $data );
        }
    }

    public function iterateDefinedLayers( callable $callback ) {
        foreach ( $this->getLayerNames() as &$name ) {
            $data = $this->getLayer( $name );
            if ( $data !== null ) {
                $callback( $data );
            }
        }
    }

    public function iterateRawMarkerMap( callable $callback ) {
        foreach ( get_object_vars( $this->getRawMarkerMap() ) as $id => $data ) {
            $callback( $id, $data );
        }
    }

    public function iterateRawLayerMap( callable $callback ) {
        foreach ( get_object_vars( $this->getRawLayerMap() ) as $id => $data ) {
            $callback( $id, $data );
        }
    }

    public function validate( Status $status ) {
        // Perform full strict validation if this is a full map, otherwise limit it to certain fields and lenience
        $isFull = !$this->isMixin();

        $this->expectField( $status, '$mixin', DataModel::TYPE_BOOL );
        if ( $isFull ) {
            $this->expectField( $status, 'mixins', DataModel::TYPE_ARRAY );
        }
        $hasCrs = $this->expectField( $status, 'crs', DataModel::TYPE_VECTOR2x2 );
        if ( $isFull ) {
            $this->requireEitherField( $status, 'image', DataModel::TYPE_STRING, 'backgrounds', DataModel::TYPE_ARRAY );
        } else {
            $this->expectEitherField( $status, 'image', DataModel::TYPE_STRING, 'backgrounds', DataModel::TYPE_ARRAY );
        }
        $this->expectField( $status, 'showCoordinates', DataModel::TYPE_BOOL );
        $this->expectField( $status, 'hideLegend', DataModel::TYPE_BOOL );
        $this->expectField( $status, 'showLegendAbove', DataModel::TYPE_BOOL );
        $this->expectField( $status, 'disableZoom', DataModel::TYPE_BOOL );
        $this->expectField( $status, 'sortChecklistsByAmount', DataModel::TYPE_BOOL );
        $this->expectField( $status, 'requireCustomMarkerIDs', DataModel::TYPE_BOOL );
        $this->expectField( $status, 'enableSearch', DataModel::TYPE_BOOL );
        $this->expectField( $status, 'leafletSettings', DataModel::TYPE_OBJECT );
        if ( $isFull ) {
            $this->requireField( $status, 'groups', DataModel::TYPE_OBJECT );
        } else {
            $this->expectField( $status, 'groups', DataModel::TYPE_OBJECT );
        }
        $this->expectField( $status, 'layers', DataModel::TYPE_OBJECT );
        $this->expectField( $status, 'custom', DataModel::TYPE_OBJECT );
        $this->expectField( $status, 'markers', DataModel::TYPE_OBJECT );
        $this->disallowOtherFields( $status );

        if ( $this->validationAreRequiredFieldsPresent ) {
            // Make sure all mixins exist and are data maps
            if ( $this->getMixins() !== null ) {
                foreach ( $this->getMixins() as &$mixinName ) {
                    $title = Title::makeTitleSafe( DataMapsConfig::getNamespace(), $mixinName );
                    $mixinPage = DataMapContent::loadPage( $title );
                    
                    if ( is_numeric( $mixinPage ) || $mixinPage->getData()->getValue() == null ) {
                        $status->fatal( 'datamap-error-validatespec-map-bad-mixin', wfEscapeWikiText( $mixinName ) );
                    }
                }
            }

            // Validate the coordinate system - only two supported schemes are [ lower lower higher higher ] (top-left), and
            // [ higher higher lower lower ] (bottom-left).
            if ( $hasCrs ) {
                $crs = $this->getCoordinateReferenceSpace();
                $first = $crs[0];
                $second = $crs[1];
                if ( !( ( $first[0] < $second[0] && $first[1] < $second[1] ) || ( $first[0] > $second[0]
                    && $first[1] > $second[1] ) ) ) {
                    $status->fatal( 'datamap-error-validate-wrong-field-type', static::$publicName, 'crs',
                        wfMessage( 'datamap-error-validate-check-docs' ) );
                }
            }

            // Validate backgrounds by the MapBackgroundSpec class
            if ( isset( $this->raw->image ) || isset( $this->raw->backgrounds ) ) {
                $multipleBgs = count( $this->getBackgrounds() ) > 1;
                foreach ( $this->getBackgrounds() as &$spec ) {
                    $spec->validate( $status, !$multipleBgs );
                }
            }
    
            // Validate marker groups by the MarkerGroupSpec class
            if ( isset( $this->raw->groups ) ) {
                foreach ( $this->getRawMarkerGroupMap() as $name => $group ) {
                    if ( empty( $name ) ) {
                        $status->fatal( 'datamap-error-validatespec-map-no-group-name' );
                    }
                
                    $spec = new MarkerGroupSpec( $name, $group );
                    $spec->validate( $status );
                }
            }

            // TODO: Validate there's no overlap between marker layer names and group names
    
            // Validate marker layers by the MarkerLayerSpec class
            if ( isset( $this->raw->layers ) ) {
                foreach ( $this->getRawMarkerLayerMap() as $name => $layer ) {
                    if ( empty( $name ) ) {
                        $status->fatal( 'datamap-error-validatespec-map-no-layer-name' );
                    }
                
                    $spec = new MarkerLayerSpec( $name, $layer );
                    $spec->validate( $status );
                }
            }

            // TODO: validate sublayers can reference parent layers properly (causes a frontend error)

            // Validate markers by the MarkerSpec class
            if ( $isFull ) {
                $requireOwnIDs = $this->wantsCustomMarkerIDs();
                $this->iterateRawMarkerMap( function ( string $layers, array $rawMarkerCollection )
                    use ( &$status, &$requireOwnIDs ) {
                    // Creating a marker model backed by an empty object, as it will later get reassigned to actual data to avoid
                    // creating thousands of small, very short-lived (only one at a time) objects
                    $marker = new MarkerSpec( new \stdclass() );
                
                    // Check if the group is defined. Don't check layers, as it's not required for any of them to be actually
                    // defined - such layers will be treated as transparent by default.
                    $layers = explode( ' ', $layers );
                    $groupName = $layers[0];
                    if ( !isset( $this->raw->groups->$groupName ) ) {
                        $status->fatal( 'datamap-error-validatespec-map-missing-group', wfEscapeWikiText( $groupName ) );
                        return;
                    }
                
                    // Validate each marker
                    foreach ( $rawMarkerCollection as &$rawMarker ) {
                        $marker->reassignTo( $rawMarker );
                        $marker->validate( $status, $requireOwnIDs );
                    }
                } );
            }
        }
    }
}
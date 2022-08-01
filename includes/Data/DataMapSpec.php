<?php
namespace MediaWiki\Extension\Ark\DataMaps\Data;

use Status;

class DataMapSpec extends DataModel {
    protected static string $publicName = 'DataMapSpec';

    private ?array $cachedMarkerGroups = null;
    private ?array $cachedMarkerLayers = null;
    private ?array $cachedBackgrounds = null;

    public function getMixins(): ?array {
        return isset( $this->raw->mixins ) ? $this->raw->mixins : null;
    }

    public function getTitle(): string {
        return $this->raw->title ?? wfMessage( 'datamap-unnamed-map' );
    }

    public function getBackgrounds(): array {
        if ( $this->cachedBackgrounds == null ) {
            if ( $this->raw->backgrounds == null ) {
                $this->cachedBackgrounds = [ MapBackgroundSpec::fromImageName( $this->raw->image ) ];
            } else {
                $this->cachedBackgrounds = array_map( fn ( $raw ) => new MapBackgroundSpec( $raw ), $this->raw->backgrounds );
            }
        }
        return $this->cachedBackgrounds;
    }

    public function getInjectedLeafletSettings(): ?object {
        return isset( $this->raw->leafletSettings ) ? $this->raw->leafletSettings : null;
    }

    public function getCustomData(): ?object {
        return isset( $this->raw->custom ) ? $this->raw->custom : null;
    }

    public function getRawMarkerMap(): object {
        return $this->raw->markers;
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
            $specifiers += $parts;
        }
        $this->cachedMarkerGroups = array_unique( $groups );
        $this->cachedMarkerLayers = array_unique( $specifiers );
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

    public function getLayer( string $name ): ?DataMapLayerSpec {
        return isset( $this->raw->layers->$name ) ? new DataMapLayerSpec( $name, $this->raw->layers->$name ) : null;
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
        $isFull = isset( $this->raw->markers );
        if ( $isFull ) {
            // Perform full strict validation, this is a full map
            $this->expectField( $status, 'mixins', DataModel::TYPE_ARRAY );
            $this->expectField( $status, 'title', DataModel::TYPE_STRING );
            $this->requireEitherField( $status, 'image', DataModel::TYPE_STRING, 'backgrounds', DataModel::TYPE_ARRAY );
            $this->expectField( $status, 'leafletSettings', DataModel::TYPE_OBJECT );
            $this->requireField( $status, 'groups', DataModel::TYPE_OBJECT );
            $this->expectField( $status, 'custom', DataModel::TYPE_OBJECT );
            $this->expectField( $status, 'markers', DataModel::TYPE_OBJECT );
        } else {
            // Perform limited, permissive validation, this is a mixin
            $this->expectEitherField( $status, 'image', DataModel::TYPE_STRING, 'backgrounds', DataModel::TYPE_ARRAY );
            $this->expectField( $status, 'leafletSettings', DataModel::TYPE_OBJECT );
            $this->expectField( $status, 'groups', DataModel::TYPE_OBJECT );
            $this->expectField( $status, 'custom', DataModel::TYPE_OBJECT );
        }
        $this->disallowOtherFields( $status );

        if ( $this->validationAreRequiredFieldsPresent ) {
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
                $this->iterateRawMarkerMap( function ( string $layers, array $rawMarkerCollection ) use ( &$status ) {
                    // Creating a marker model backed by an empty object, as it will later get reassigned to actual data to avoid
                    // creating thousands of small, very short-lived (only one at a time) objects
                    $marker = new MarkerSpec( new \stdclass() );
                
                    // Check if the group is defined. Don't check layers, as it's not required for any of them to be actually
                    // defined - such layers will be treated as transparent by default.
                    $layers = explode( ' ', $layers );
                    $groupName = $layers[0];
                    if ( !isset( $this->raw->groups->$groupName ) ) {
                        $status->fatal( 'datamap-error-validatespec-map-missing-group', $groupName );
                        return;
                    }
                
                    // Validate each marker
                    foreach ( $rawMarkerCollection as &$rawMarker ) {
                        $marker->reassignTo( $rawMarker );
                        $marker->validate( $status );
                    }
                } );
            }
        }
    }
}
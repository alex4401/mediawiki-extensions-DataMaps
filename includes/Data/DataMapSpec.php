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

    public function getCoordinateSpace(): object {
        return $this->raw->coordinateBounds;
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

    public function getMarkerGroupNames(): array {
        return $this->getGroupNames();
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

    public function getLayer( string $name ): DataMapLayerSpec {
        // TODO: implement layers for Genesis Part 2 resource map (asteroid cluster rotations)
        return null;//return new DataMapLayerSpec($this->raw->layers->$name);
    }

    public function iterateGroups( callable $callback ) {
        foreach ( $this->getMarkerGroupNames() as &$name ) {
            $data = $this->getGroup( $name );
            $callback( $data );
        }
    }

    public function iterateRawMarkerMap( callable $callback ) {
        foreach ( get_object_vars( $this->getRawMarkerMap() ) as $layers => $markers ) {
            $callback( $layers, $markers );
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
                    $spec->validate( $status );
                }
            }

            // Validate markers by the MarkerSpec class
            if ( $isFull ) {
                $this->iterateRawMarkerMap( function ( string $layers, array $rawMarkerCollection ) use ( &$status ) {
                    // Creating a marker model backed by an empty object, as it will later get reassigned to actual data to avoid
                    // creating thousands of small, very short-lived (only one at a time) objects
                    $marker = new MarkerSpec( new \stdclass() );
                
                    $layers = explode( ' ', $layers );
                    $groupName = $layers[0];
                    if ( !isset( $this->raw->groups->$groupName ) ) {
                        $status->fatal( 'datamap-error-validatespec-map-missing-group', $groupName );
                        return;
                    }
                
                    foreach ( $rawMarkerCollection as &$rawMarker ) {
                        $marker->reassignTo( $rawMarker );
                        $marker->validate( $status );
                    }
                } );
            }
        }
    }
}
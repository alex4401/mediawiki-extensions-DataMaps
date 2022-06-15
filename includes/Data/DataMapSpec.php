<?php
namespace Ark\DataMaps\Data;

class DataMapSpec {
    private object $raw;

    private ?array $cachedMarkerGroups = null;
    private ?array $cachedMarkerLayers = null;
    private ?array $cachedBackgrounds = null;

    public function __construct( object $raw ) {
        $this->raw = $raw;
    }

    public function getTitle(): string {
        return $this->raw->title ?? wfMessage( 'datamap-unnamed-map' );
    }

    public function getBackgrounds(): array {
        if ( $this->cachedBackgrounds == null ) {
            if ( $this->raw->backgrounds == null ) {
                $fake = new \stdClass();
                $fake->image = $this->raw->image;
                $this->cachedBackgrounds = [ new DataMapBackgroundSpec( $fake ) ];
            } else {
                $this->cachedBackgrounds = array_map( fn ( $raw ) => new DataMapBackgroundSpec( $raw ), $this->raw->backgrounds );
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

    public function getGroup( string $name ): DataMapGroupSpec {
        return new DataMapGroupSpec( $name, $this->raw->groups->$name );
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

    public function validate(): ?string {
        // TODO: implement. check validity of fields, and of descendants.
        return null;
    }
}
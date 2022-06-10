<?php
namespace Ark\DataMaps\Data;

class DataMapSpec {
    private object $raw;

    private ?array $cachedMarkerGroups = null;
    private ?array $cachedMarkerLayers = null;

    public function __construct(object $raw) {
        $this->raw = $raw;
    }

    public function getTitle(): string {
        return $this->raw->title ?? wfMessage( 'datamap-unnamed-map' );
    }

    public function getImageName(): string {
        return $this->raw->image;
    }

    public function getCoordinateSpace(): object {
        return $this->raw->coordinateBounds;
    }

    public function getInjectedLeafletSettings(): ?object {
        return $this->raw->leafletSettings;
    }

    public function getCustomData(): ?object {
        return $this->raw->custom;
    }

    public function getRawMarkers(): object {
        return $this->raw->markers;
    }

    private function warmUpUsedMarkerTypes() {
        $groups = array();
        $specifiers = array();
        foreach (array_keys(get_object_vars($this->raw->markers)) as &$name) {
            $parts = explode(' ', $name);
            $groups[] = array_shift($parts);
            $specifiers += $parts;
        }
        $this->cachedMarkerGroups = array_unique($groups);
        $this->cachedMarkerLayers = array_unique($specifiers);
    }

    public function getMarkerGroupNames(): array {
        return $this->getGroupNames();
    }

    public function getGroupNames(): array {
        if ($this->cachedMarkerGroups == null) {
            $this->warmUpUsedMarkerTypes();
        }
        return $this->cachedMarkerGroups;
    }

    public function getLayerNames(): array {
        if ($this->cachedMarkerLayers == null) {
            $this->warmUpUsedMarkerTypes();
        }
        return $this->cachedMarkerLayers;
    }

    public function getGroup(string $name): DataMapGroupSpec {
        return new DataMapGroupSpec($name, $this->raw->groups->$name);
    }

    public function getLayer(string $name): DataMapLayerSpec {
        // TODO: implement layers for Genesis Part 2 resource map (asteroid cluster rotations)
        return null;//return new DataMapLayerSpec($this->raw->layers->$name);
    }

    public function iterateGroups(callable $callback) {
        foreach ($this->getMarkerGroupNames() as &$name) {
            $data = $this->getGroup($name);
            $callback($data);
        }
    }

    public function validate(): ?string {
        // TODO: implement. check validity of fields, and of descendants.
        return null;
    }
}
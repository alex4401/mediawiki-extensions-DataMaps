<?php
namespace Ark\DataMaps\Data;

class DataMapGroupSpec {
    const DEFAULT_MARKER_SIZE = 4;

    // Display modes
    const DM_CIRCLE = 1;
    const DM_ICON = 2;

    private string $id;
    private object $raw;

    public function __construct(string $id, object $raw) {
        $this->id = $id;
        $this->raw = $raw;
    }

    public function getId(): string {
        return $this->id;
    }

    public function getName(): string {
        return $this->raw->name ?? wfMessage('datamap-unnamed-marker');
    }

    public function getSize(): string {
        return $info->size ?? self::DEFAULT_MARKER_SIZE;
    }

    public function getFillColour(): string|null {
        // TODO: validate if this is actually a colour (RGB (consider arrays?) or HEX)
        return $this->raw->fillColor;
    }

    public function getMarkerIcon(): string|null {
        return $this->raw->markerIcon ?? $this->raw->icon;
    }

    public function getLegendIcon(): string|null {
        return $this->raw->legendIcon ?? $this->raw->icon;
    }

    public function getDisplayMode(): int {
        return $this->getMarkerIcon() === null ? self::DM_CIRCLE : self::DM_ICON;
    }

    public function validate(): string|null {
        // TODO: switch from exceptions to DataMapValidationResult
        if ($this->getMarkerIcon() === null && $this->getFillColour() === null) {
            return wfMessage( 'datamap-error-validation-no-display', $this->id )->escaped();
        }

        if ($this->getMarkerIcon() !== null && $this->getFillColour() !== null) {
            return wfMessage( 'datamap-error-validation-ambiguous-display', $this->id )->escaped();
        }

        return null;
    }
}
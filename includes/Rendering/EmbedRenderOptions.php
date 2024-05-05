<?php
namespace MediaWiki\Extension\DataMaps\Rendering;

class EmbedRenderOptions {
    public ?array $displayGroups = null;
    public ?int $maxWidthPx = null;
    public ?array $classes = null;
    public bool $miniStyle = false;
    public ?string $markerIdToCentreOn = null;
    public ?string $markerIdToOpen = null;
}

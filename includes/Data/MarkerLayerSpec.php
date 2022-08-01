<?php
namespace MediaWiki\Extension\Ark\DataMaps\Data;

use MediaWiki\Extension\Ark\DataMaps\Rendering\Utils\DataMapColourUtils;
use Status;
use stdclass;

class MarkerLayerSpec extends DataModel {
    protected static string $publicName = 'MarkerLayerSpec';

    private string $id;

    const TYPE_TRANSPARENT = 'transparent';
    const TYPE_SINGLE_CHOICE = 'single';
    const TYPE_MULTIPLE_CHOICE = 'multiple';

    public function __construct( string $id, stdclass $raw ) {
        parent::__construct( $raw );
        $this->id = $id;
    }

    public function getId(): string {
        return $this->id;
    }

    public function getName(): string {
        return $this->raw->name;
    }

    public function getType(): string {
        return isset( $this->raw->type ) ? $this->raw->type : self::TYPE_TRANSPARENT;
    }

    public function canHaveSubs(): bool {
        return in_array( $this->getType(), [ self::TYPE_SINGLE_CHOICE, self::TYPE_MULTIPLE_CHOICE ] );
    }

    public function getPopupDiscriminator(): ?string {
        return isset( $this->raw->subtleText ) ? $this->raw->subtleText : null;
    }

    public function getActiveBackgroundOverlays(): ?array {
        return isset( $this->raw->overlays ) ? $this->raw->overlays : null;
    }

    public function hasOverlays(): bool {
        return isset( $this->raw->overlays );
    }

    public function iterateOverlays( callable $callback ) {
        foreach ( $this->raw->overlays as &$raw ) {
            $callback( new MapBackgroundOverlaySpec( $raw ) );
        }
    }
    
    public function validate( Status $status ) {
        $this->requireField( $status, 'name', DataModel::TYPE_STRING );
        $hasType = $this->expectField( $status, 'type', DataModel::TYPE_STRING );
        $this->expectField( $status, 'subtleText', DataModel::TYPE_STRING );

        if ( $hasType && !in_array( $this->getType(), [ self::TYPE_TRANSPARENT, self::TYPE_SINGLE_CHOICE,
            self::TYPE_MULTIPLE_CHOICE ] ) ) {
            $status->fatal( 'datamap-error-validatespec-layer-bad-type', $this->getType() );
        }

        if ( $hasType && $this->getType() === self::TYPE_SINGLE ) {
            $this->expectField( $status, 'overlays', DataModel::TYPE_ARRAY );
        }

        $this->disallowOtherFields( $status );
    }
}
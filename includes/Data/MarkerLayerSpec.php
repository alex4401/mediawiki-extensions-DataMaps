<?php
namespace MediaWiki\Extension\Ark\DataMaps\Data;

use MediaWiki\Extension\Ark\DataMaps\Rendering\Utils\DataMapColourUtils;
use Status;
use stdclass;

class MarkerLayerSpec extends DataModel {
    protected static string $publicName = 'MarkerLayerSpec';

    private string $id;

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

    public function getPopupDiscriminator(): ?string {
        return isset( $this->raw->subtleText ) ? $this->raw->subtleText : null;
    }
    
    public function validate( Status $status ) {
        $this->requireField( $status, 'name', DataModel::TYPE_STRING );
        $this->expectField( $status, 'subtleText', DataModel::TYPE_STRING );
        $this->disallowOtherFields( $status );
    }
}
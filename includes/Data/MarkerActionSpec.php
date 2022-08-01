<?php
namespace Ark\DataMaps\Data;

use Ark\DataMaps\Rendering\Utils\DataMapColourUtils;
use Status;
use stdclass;

class MarkerActionSpec extends DataModel {
    protected static string $publicName = 'MarkerActionSpec';

    public function getName(): string {
        return $this->raw->name;
    }

    public function getPageToGoTo(): ?string {
        return isset( $this->raw->goToPage ) ? $this->raw->goToPage : null;
    }

    public function getMarkerToGoTo(): ?string {
        return isset( $this->raw->goToMarker ) ? $this->raw->goToMarker : null;
    }
    
    public function validate( Status $status ) {
        $this->requireField( $status, 'name', DataModel::TYPE_STRING );
        $this->disallowOtherFields( $status );
    }
}
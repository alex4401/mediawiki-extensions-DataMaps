<?php
namespace MediaWiki\Extension\Ark\DataMaps\Data;

use Status;

class MarkerSpec extends DataModel {
    protected static string $publicName = 'MarkerSpec';
    
    public function reassignTo( object $newRaw ) {
        $this->raw = $newRaw;
    }

    public function getLatitude(): float {
        return $this->raw->lat;
    }

    public function getLongitude(): float {
        return $this->raw->lon;
    }

    public function getLabel(): ?string {
        return isset( $this->raw->label ) ? $this->raw->label : null;
    }

    public function getDescription(): ?string {
        return isset( $this->raw->description ) ? $this->raw->description : null;
    }

    public function isWikitext(): ?bool {
        return isset( $this->raw->isWikitext ) ? $this->raw->isWikitext : null;
    }

    public function getPopupImage(): ?string {
        return isset( $this->raw->popupImage ) ? $this->raw->popupImage : null;
    }

    public function getRelatedArticle(): ?string {
        return isset( $this->raw->article ) ? $this->raw->article : null;
    }

    public function getCustomPersistentId() {
        return isset( $this->raw->id ) ? $this->raw->id : null;
    }

    public function validate( Status $status ) {
        $this->expectField( $status, 'id', DataModel::TYPE_STRING_OR_NUMBER );
        $this->requireField( $status, 'lat', DataModel::TYPE_NUMBER );
        $this->requireField( $status, 'lon', DataModel::TYPE_NUMBER );
        $this->expectField( $status, 'label', DataModel::TYPE_STRING );
        $this->expectField( $status, 'description', DataModel::TYPE_STRING );
        $this->expectField( $status, 'isWikitext', DataModel::TYPE_BOOL );
        $this->expectField( $status, 'article', DataModel::TYPE_STRING );
        $this->expectField( $status, 'popupImage', DataModel::TYPE_STRING );
        $this->disallowOtherFields( $status );

        if ( $this->validationAreRequiredFieldsPresent ) {
            $this->requireFile( $status, $this->getPopupImage() );
        }
    }
}
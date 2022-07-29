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
        // DEPRECATED(v0.6.0:v0.9.0): switch to `lon`, same length as `lat`
        return isset( $this->raw->long ) ? $this->raw->long : $this->raw->lon;
    }

    public function getLabel(): ?string {
        return isset( $this->raw->label ) ? $this->raw->label : null;
    }

    public function getDescription(): ?string {
        return isset( $this->raw->description ) ? $this->raw->description : null;
    }

    public function isWikitext(): ?bool {
        return isset( $this->raw->isWikitext ) ? $this->raw->isWikitext : (
            // DEPRECATED(v0.7.0:v0.9.0): switch to `isWikitext`, inclusive of title
            isset( $this->raw->isDescriptionWikitext ) ? $this->raw->isDescriptionWikitext : null
        );
    }

    public function getPopupImage(): ?string {
        return isset( $this->raw->popupImage ) ? $this->raw->popupImage : null;
    }

    public function getRelatedArticle(): ?string {
        return isset( $this->raw->article ) ? $this->raw->article : (
            // DEPRECATED(v0.7.0:v0.9.0): switch to `article`, more intuitive
            isset( $this->raw->relatedArticle ) ? $this->raw->relatedArticle : null
        );
    }

    public function validate( Status $status ) {
        $this->requireField( $status, 'lat', DataModel::TYPE_NUMBER );
        if ( !isset( $this->raw->long ) ) {
            $this->requireField( $status, 'lon', DataModel::TYPE_NUMBER );
        }
        $this->allowReplacedField( $status, 'long', DataModel::TYPE_NUMBER, 'lon', 'v0.6.0', 'v0.9.0' );
        $this->expectField( $status, 'label', DataModel::TYPE_STRING );
        $this->expectField( $status, 'description', DataModel::TYPE_STRING );
        $this->expectField( $status, 'isWikitext', DataModel::TYPE_BOOL );
        $this->allowReplacedField( $status, 'isDescriptionWikitext', DataModel::TYPE_BOOL, 'isWikitext', 'v0.7.0', 'v0.9.0' );
        $this->expectField( $status, 'article', DataModel::TYPE_STRING );
        $this->allowReplacedField( $status, 'relatedArticle', DataModel::TYPE_STRING, 'article', 'v0.7.0', 'v0.9.0' );
        $this->expectField( $status, 'popupImage', DataModel::TYPE_STRING );
        $this->disallowOtherFields( $status );

        if ( $this->validationAreRequiredFieldsPresent ) {
            $this->requireFile( $status, $this->getPopupImage() );
        }
    }
}
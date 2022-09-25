<?php
namespace MediaWiki\Extension\Ark\DataMaps\Data;

use Status;

class MarkerSpec extends DataModel {
    protected static string $publicName = 'MarkerSpec';
    
    public function reassignTo( object $newRaw ) {
        $this->raw = $newRaw;
    }

    public function getLatitude(): float {
        return isset( $this->raw->lat ) ? $this->raw->lat : $this->raw->y;
    }

    public function getLongitude(): float {
        return isset( $this->raw->lon ) ? $this->raw->lon : $this->raw->x;
    }

    public function getLabel(): ?string {
        return isset( $this->raw->name ) ? $this->raw->name : (
            /* DEPRECATED(v0.11.3:v0.13.0) */
            isset( $this->raw->label ) ? $this->raw->label : null
        );
    }

    public function getDescription()/*: ?array|string */ {
        return isset( $this->raw->description ) ? $this->raw->description : null;
    }

    public function isWikitext(): ?bool {
        return isset( $this->raw->isWikitext ) ? $this->raw->isWikitext : null;
    }

    public function getPopupImage(): ?string {
        return isset( $this->raw->image ) ? $this->raw->image : (
            /* DEPRECATED(v0.11.3:v0.13.0) */
            isset( $this->raw->popupImage ) ? $this->raw->popupImage : null
        );
    }

    public function getRelatedArticle(): ?string {
        return isset( $this->raw->article ) ? $this->raw->article : null;
    }

    public function getCustomPersistentId() {
        return isset( $this->raw->id ) ? $this->raw->id : null;
    }

    public function getSearchKeywords()/*: ?array|string */ {
        return isset( $this->raw->searchKeywords ) ? $this->raw->searchKeywords : null;
    }

    public function isIncludedInSearch(): bool {
        return isset( $this->raw->canSearchFor ) ? $this->raw->canSearchFor : true;
    }

    public function validate( Status $status, bool $requireOwnID = false ) {
        if ( $requireOwnID ) {
            $this->requireField( $status, 'id', DataModel::TYPE_STRING_OR_NUMBER );
        } else {
            $this->expectField( $status, 'id', DataModel::TYPE_STRING_OR_NUMBER );
        }
        $this->requireEitherField( $status, 'lat', DataModel::TYPE_NUMBER, 'y', DataModel::TYPE_NUMBER );
        $this->requireEitherField( $status, 'lon', DataModel::TYPE_NUMBER, 'x', DataModel::TYPE_NUMBER );
        $this->allowReplacedField( $status, 'label', DataModel::TYPE_STRING, 'name', '0.11.3', '0.13.0' );
        $this->expectField( $status, 'name', DataModel::TYPE_STRING );
        $this->expectField( $status, 'description', DataModel::TYPE_ARRAY_OR_STRING );
        $this->expectField( $status, 'isWikitext', DataModel::TYPE_BOOL );
        $this->expectField( $status, 'article', DataModel::TYPE_STRING );
        $this->allowReplacedField( $status, 'popupImage', DataModel::TYPE_STRING, 'image', '0.11.3', '0.13.0' );
        $this->expectField( $status, 'image', DataModel::TYPE_STRING );
        $this->expectEitherField( $status, 'searchKeywords', DataModel::TYPE_ARRAY_OR_STRING,
            'excludeFromSearch', DataModel::TYPE_BOOL );
        $this->disallowOtherFields( $status );

        if ( isset( $this->raw->searchKeywords ) && is_array( $this->raw->searchKeywords ) ) {
            foreach ( $this->getSearchKeywords() as &$item ) {
                $isValidWeighedPair = ( is_array( $item ) && count( $item ) === 2
                    && $this->verifyType( $item[0], DataModel::TYPE_STRING )
                    && $this->verifyType( $item[1], DataModel::TYPE_NUMBER ) );
                
                if ( !$isValidWeighedPair && !$this->verifyType( $item, DataModel::TYPE_STRING ) ) {
                    $status->fatal( 'datamap-error-validate-wrong-field-type', static::$publicName, 'searchKeywords',
                        wfMessage( 'datamap-error-validate-check-docs' ) );
                }
            }
        }

        if ( $this->validationAreRequiredFieldsPresent ) {
            $this->requireFile( $status, $this->getPopupImage() );
        }
    }
}
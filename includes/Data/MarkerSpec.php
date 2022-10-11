<?php
namespace MediaWiki\Extension\Ark\DataMaps\Data;

use Status;

class MarkerSpec extends DataModel {
    protected static string $publicName = 'MarkerSpec';
    
    public function reassignTo( object $newRaw ) {
        $this->raw = $newRaw;
    }

    /**
     * Returns marker's Y coordinate.
     */
    public function getLatitude(): float {
        return isset( $this->raw->lat ) ? $this->raw->lat : $this->raw->y;
    }

    /**
     * Returns marker's X coordinate.
     */
    public function getLongitude(): float {
        return isset( $this->raw->lon ) ? $this->raw->lon : $this->raw->x;
    }

    /**
     * Returns marker's label that will be shown in its popup and search.
     */
    public function getLabel(): ?string {
        return isset( $this->raw->name ) ? $this->raw->name : null;
    }

    /**
     * Returns marker's description that will be shown in its popup and used as a keyword source for search.
     */
    public function getDescription()/*: ?array|string */ {
        return isset( $this->raw->description ) ? $this->raw->description : null;
    }

    /**
     * Returns whether the label and description should be treated as wikitext as indicated by the data.
     * 
     * If null, leaves the decision to MarkerProcessor.
     */
    public function isWikitext(): ?bool {
        return isset( $this->raw->isWikitext ) ? $this->raw->isWikitext : null;
    }

    /**
     * Returns marker's image to be shown in its popup.
     */
    public function getPopupImage(): ?string {
        return isset( $this->raw->image ) ? $this->raw->image : null;
    }

    /**
     * Returns an article to be linked in the marker's popup.
     */
    public function getRelatedArticle(): ?string {
        return isset( $this->raw->article ) ? $this->raw->article : null;
    }

    /**
     * If set, returns the unique identifier requested in this marker's data. This identifier will be used in persistent
     * links and functions requiring browser's storage.
     */
    public function getCustomPersistentId() {
        return isset( $this->raw->id ) ? $this->raw->id : null;
    }

    /**
     * Returns optional keywords override to be used by search.
     */
    public function getSearchKeywords()/*: ?array|string */ {
        return isset( $this->raw->searchKeywords ) ? $this->raw->searchKeywords : null;
    }

    /**
     * Returns whether this marker should show up in search results.
     */
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
        $this->expectField( $status, 'name', DataModel::TYPE_STRING );
        $this->expectField( $status, 'description', DataModel::TYPE_ARRAY_OR_STRING );
        $this->expectField( $status, 'isWikitext', DataModel::TYPE_BOOL );
        $this->expectField( $status, 'article', DataModel::TYPE_STRING );
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
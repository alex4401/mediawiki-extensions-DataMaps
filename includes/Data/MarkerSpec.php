<?php
namespace MediaWiki\Extension\DataMaps\Data;

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

    public function getCustomIcon(): ?string {
        return isset( $this->raw->icon ) ? $this->raw->icon : null;
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

    public function getRelatedArticleTarget(): ?string {
        $value = $this->getRelatedArticle();
        if ( str_contains( $value, '|' ) ) {
            return explode( '|', $value, 2 )[ 0 ];
        }
        return $value;
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
        $this->checkField( $status, [
            'name' => 'id',
            'type' => [ DataModel::TYPE_STRING, DataModel::TYPE_NUMBER ],
            'required' => $requireOwnID
        ] );
        $this->checkField( $status, [
            'names' => [ 'lat', 'y' ],
            'type' => DataModel::TYPE_NUMBER,
            'required' => true
        ] );
        $this->checkField( $status, [
            'names' => [ 'lon', 'x' ],
            'type' => DataModel::TYPE_NUMBER,
            'required' => true
        ] );
        $this->checkField( $status, 'name', DataModel::TYPE_STRING );
        $this->checkField( $status, [
            'name' => 'description',
            'type' => [ DataModel::TYPE_ARRAY, DataModel::TYPE_STRING ],
            'itemType' => DataModel::TYPE_STRING
        ] );
        $this->checkField( $status, [
            'name' => 'icon',
            'type' => DataModel::TYPE_FILE,
            'fileMustExist' => true
        ] );
        $this->checkField( $status, 'isWikitext', DataModel::TYPE_BOOL );
        $this->checkField( $status, 'article', DataModel::TYPE_STRING );
        $this->checkField( $status, [
            'name' => 'image',
            'type' => DataModel::TYPE_FILE,
            'fileMustExist' => true
        ] );
        $this->conflict( $status, [ 'searchKeywords', 'canSearchFor' ] );
        $this->checkField( $status, [
            'name' => 'searchKeywords',
            'type' => [ DataModel::TYPE_ARRAY, DataModel::TYPE_STRING ],
            'itemType' => DataModel::TYPE_ARRAY,
            'itemCheck' => function ( Status $status, $item ) {
                $isValidWeighedPair = ( count( $item ) === 2
                    && $this->verifyType( $item[0], DataModel::TYPE_STRING )
                    && $this->verifyType( $item[1], DataModel::TYPE_NUMBER ) );
                if ( !$isValidWeighedPair && !$this->verifyType( $item, DataModel::TYPE_STRING ) ) {
                    $status->fatal( 'datamap-error-validate-wrong-field-type', static::$publicName, 'searchKeywords',
                        wfMessage( 'datamap-error-validate-check-docs' ) );
                    return false;
                }
                return true;
            }
        ] );
        $this->checkField( $status, 'canSearchFor', DataModel::TYPE_BOOL );
        $this->disallowOtherFields( $status );
        return $this->isValidationSuccessful;
    }
}

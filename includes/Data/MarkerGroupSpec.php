<?php
namespace MediaWiki\Extension\Ark\DataMaps\Data;

use MediaWiki\Extension\Ark\DataMaps\Rendering\Utils\DataMapColourUtils;
use Status;
use stdclass;

class MarkerGroupSpec extends DataModel {
    protected static string $publicName = 'MarkerGroupSpec';

    const DEFAULT_CIRCLE_SIZE = 5;
    const DEFAULT_CIRCLE_STROKE_WIDTH = 1;
    const DEFAULT_ICON_SIZE = [ 32, 32 ];

    // Display modes
    const DM_CIRCLE = 1;
    const DM_ICON = 2;
    const DM_UNKNOWN = -1;

    // Collectible modes
    const CM_INDIVIDUAL = 1;
    const CM_AS_ONE = 2;
    const CM_AS_ONE_GLOBAL = 3;
    const CM_UNKNOWN = -1;

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

    private function getSizePropertyInternal() {
        return isset( $this->raw->size ) ? $this->raw->size : null;
    }

    public function getSize() {
        switch ( $this->getDisplayMode() ) {
            case self::DM_CIRCLE:
                return $this->getSizePropertyInternal() ?? self::DEFAULT_CIRCLE_SIZE;
            case self::DM_ICON:
                $out = $this->getSizePropertyInternal() ?? self::DEFAULT_ICON_SIZE;
                // Ensure 2D
                if ( is_numeric( $out ) ) {
                    $out = [ $out, $out ];
                }
                return $out;
            default:
                return null;
        }
    }

    public function getExtraMinZoomSize() {
        return isset( $this->raw->extraMinZoomSize ) ? $this->raw->extraMinZoomSize : null;
    }

    public function getRawFillColour() /*: ?array|string*/ {
        return isset( $this->raw->fillColor ) ? $this->raw->fillColor : null;
    }

    public function getRawStrokeColour() /*: ?array|string*/ {
        return isset( $this->raw->borderColor ) ? $this->raw->borderColor : null;
    }

    public function getFillColour(): array {
        return DataMapColourUtils::decode( $this->getRawFillColour() );
    }

    public function getStrokeColour(): array {
        if ( $this->getRawStrokeColour() != null ) {
            return DataMapColourUtils::decode( $this->getRawStrokeColour() );
        }

        return $this->getFillColour();
    }

    public function getStrokeWidth() /*: ?int|float */ {
        return isset( $this->raw->borderWidth ) ? $this->raw->borderWidth : self::DEFAULT_CIRCLE_STROKE_WIDTH;
    }

    public function getIcon(): ?string {
        return isset( $this->raw->icon ) ? $this->raw->icon : null;
    }

    public function getDisplayMode(): int {
        if ( $this->getRawFillColour() !== null ) {
            return self::DM_CIRCLE;
        } else if ( $this->getIcon() !== null ) {
            return self::DM_ICON;
        }
        return self::DM_UNKNOWN;
    }

    public function getSharedRelatedArticle(): ?string {
        return isset( $this->raw->article ) ? $this->raw->article : null;
    }

    public function getCollectibleMode(): ?int {
        if ( isset( $this->raw->isCollectible ) ) {
            switch ( $this->raw->isCollectible ) {
                case true:
                case "individual":
                    return self::CM_INDIVIDUAL;
                case "group":
                    return self::CM_AS_ONE;
                case "globalGroup":
                    return self::CM_AS_ONE_GLOBAL;
            }
        }
        return null;
    }

    public function wantsChecklistNumbering(): bool {
        return isset( $this->raw->autoNumberInChecklist ) ? $this->raw->autoNumberInChecklist : false;
    }

    public function isIncludedInSearch(): bool {
        return isset( $this->raw->canSearchFor ) ? $this->raw->canSearchFor : (
            /* DEPRECATED(v0.12.0:v0.13.0) */
            !( isset( $this->raw->excludeFromSearch ) ? $this->raw->excludeFromSearch : false )
        );
    }

    public function isDefault(): bool {
        return isset( $this->raw->isDefault ) ? $this->raw->isDefault : true;
    }

    public function validate( Status $status ) {
        $this->requireField( $status, 'name', DataModel::TYPE_STRING );

        switch ( $this->getDisplayMode() ) {
            case self::DM_CIRCLE:
                $this->requireField( $status, 'fillColor', DataModel::TYPE_COLOUR3 );
                $this->expectField( $status, 'borderColor', DataModel::TYPE_COLOUR3 );
                $this->expectField( $status, 'borderWidth', DataModel::TYPE_NUMBER );
                $this->expectField( $status, 'size', DataModel::TYPE_NUMBER );
                $this->expectField( $status, 'extraMinZoomSize', DataModel::TYPE_NUMBER );
                $this->expectField( $status, 'icon', DataModel::TYPE_STRING );
                break;
            case self::DM_ICON:
                $this->requireField( $status, 'icon', DataModel::TYPE_STRING );
                $this->expectField( $status, 'size', DataModel::TYPE_DIMENSIONS );
                break;
            case self::DM_UNKNOWN:
                $status->fatal( 'datamap-error-validatespec-group-no-display', wfEscapeWikiText( $this->id ) );
                return;
        }

        $this->expectField( $status, 'article', DataModel::TYPE_STRING );
        $this->expectField( $status, 'isDefault', DataModel::TYPE_BOOL );
        $this->expectField( $status, 'isCollectible', DataModel::TYPE_BOOL_OR_STRING );
        $this->expectField( $status, 'autoNumberInChecklist', DataModel::TYPE_BOOL );
        $this->allowReplacedField( $status, 'excludeFromSearch', DataModel::TYPE_BOOL, 'canSearchFor', '0.12.0', '0.13.0' );
        $this->expectField( $status, 'canSearchFor', DataModel::TYPE_BOOL );

        if ( $this->getCollectibleMode() === self::CM_UNKNOWN ) {
            $status->fatal( 'datamap-error-validate-wrong-field-type', static::$publicName, 'isCollectible',
                wfMessage( 'datamap-error-validate-check-docs' ) );
        }

        $this->disallowOtherFields( $status );

        if ( $this->validationAreRequiredFieldsPresent ) {
            if ( $this->getIcon() !== null ) {
                $this->requireFile( $status, $this->getIcon() );
            }
        }
    }
}
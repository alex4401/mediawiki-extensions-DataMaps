<?php
namespace Ark\DataMaps\Data;

use Ark\DataMaps\Rendering\Utils\DataMapColourUtils;
use Status;

class DataMapGroupSpec extends DataModel {
    protected static string $publicName = 'MarkerGroupSpec';

    const DEFAULT_CIRCLE_SIZE = 5;
    const DEFAULT_CIRCLE_STROKE_WIDTH = 1;
    const DEFAULT_ICON_SIZE = [ 32, 32 ];

    // Display modes
    const DM_CIRCLE = 1;
    const DM_ICON = 2;
    const DM_UNKNOWN = -1;

    private string $id;

    public function __construct( string $id, object $raw ) {
        parent::__construct( $raw );
        $this->id = $id;
    }

    public function getId(): string {
        return $this->id;
    }

    public function getName(): string {
        return $this->raw->name;
    }

    public function getCircleSize(): int {
        assert( $this->getDisplayMode() == self::DM_CIRCLE );
        return isset( $this->raw->size ) ? $this->raw->size : self::DEFAULT_CIRCLE_SIZE;
    }

    public function getIconSize(): array {
        assert( $this->getDisplayMode() == self::DM_ICON );
        return isset( $this->raw->size ) ? $this->raw->size : self::DEFAULT_ICON_SIZE;
    }

    public function getSize() {
        switch ( $this->getDisplayMode() ) {
            case self::DM_CIRCLE:
                return $this->getCircleSize();
            case self::DM_ICON:
                $dim = $this->getIconSize();
                if ( is_numeric( $dim ) ) {
                    $dim = [ $dim, $dim ];
                }
                return $dim;
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
        return isset( $this->raw->article ) ? $this->raw->article : (
            // DEPRECATED(v0.7.0:v0.9.0): switch to `article`, more intuitive
            isset( $this->raw->relatedArticle ) ? $this->raw->relatedArticle : null
        );
    }

    public function canDismiss(): bool {
        return isset( $this->raw->canDismiss ) ? $this->raw->canDismiss : false;
    }

    public function validate( Status $status ) {
        $this->requireField( $status, 'name', DataModel::TYPE_STRING );

        switch ( $this->getDisplayMode() ) {
            case self::DM_CIRCLE:
                $this->requireField( $status, 'fillColor', DataModel::TYPE_COLOUR );
                $this->expectField( $status, 'borderColor', DataModel::TYPE_COLOUR );
                $this->expectField( $status, 'borderWidth', DataModel::TYPE_NUMBER );
                $this->expectField( $status, 'size', DataModel::TYPE_NUMBER );
                $this->expectField( $status, 'extraMinZoomSize', DataModel::TYPE_NUMBER );
                $this->expectField( $status, 'icon', DataModel::TYPE_STRING );
                break;
            case self::DM_ICON:
                $this->requireField( $status, 'icon', DataModel::TYPE_STRING );
                $this->expectField( $status, 'size', DataModel::TYPE_VECTOR2 );
                break;
            case self::DM_UNKNOWN:
                $status->fatal( 'datamap-error-validatespec-group-no-display', wfEscapeWikiText( $this->id ) );
                return;
        }

        $this->expectField( $status, 'article', DataModel::TYPE_STRING );
        $this->expectField( $status, 'canDismiss', DataModel::TYPE_BOOL );

        $this->disallowOtherFields( $status );

        if ( $this->validationAreRequiredFieldsPresent ) {
            if ( $this->getIcon() !== null ) {
                $this->requireFile( $status, $this->getIcon() );
            }
        }
    }
}
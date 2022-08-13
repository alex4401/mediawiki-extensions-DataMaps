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

    public function canDismiss(): bool {
        return isset( $this->raw->canDismiss ) ? $this->raw->canDismiss : false;
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
        if ( $this->getDisplayMode() == self::DM_ICON ) {
            $this->expectField( $status, 'canDismiss', DataModel::TYPE_BOOL );
        }

        $this->disallowOtherFields( $status );

        if ( $this->validationAreRequiredFieldsPresent ) {
            if ( $this->getIcon() !== null ) {
                $this->requireFile( $status, $this->getIcon() );
            }
        }
    }
}
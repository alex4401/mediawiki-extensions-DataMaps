<?php
namespace MediaWiki\Extension\DataMaps\Data;

use MediaWiki\Extension\DataMaps\Rendering\Utils\DataMapColourUtils;
use Status;
use stdClass;

class MapSettingsSpec extends DataModel {
    protected static string $publicName = 'MapSettingsSpec';

    public const SM_NONE = 0;
    public const SM_SELF = 1;
    public const SM_TABBER = 2;

    /**
     * @deprecated since v0.16, will be removed in v1.0. Use SC_GROUP_DECLARATION_ORDER instead.
     */
    public const SC_LOCATION = 0;
    public const SC_GROUP_DECLARATION_ORDER = 0;
    public const SC_AMOUNT = 1;

    public const IRT_AUTO = 0;
    public const IRT_DOM = 1;
    public const IRT_CANVAS = 2;

    public function allowsFullscreen(): bool {
        return $this->raw->allowFullscreen ?? true;
    }

    public function areTooltipPopupsEnabled(): bool {
        return $this->raw->enableTooltipPopups ?? false;
    }

    public function getRawBackdropColour() /*: ?array|string*/ {
        return isset( $this->raw->backdropColor ) ? $this->raw->backdropColor : null;
    }

    public function getBackdropColour(): ?array {
        return DataMapColourUtils::decode( $this->getRawBackdropColour() );
    }

    public function getIconRendererType(): int {
        $value = $this->raw->iconRenderer ?? 'auto';
        switch ( $value ) {
            case 'DOM':
                return self::IRT_DOM;
            case 'canvas':
                return self::IRT_CANVAS;
        }
        return self::IRT_AUTO;
    }

    public function isZoomDisabled(): bool {
        return $this->getZoomSettings()->isLocked();
    }

    public function getZoomSettings(): ?ZoomSettingsSpec {
        $property = $this->raw->zoom ?? new stdClass();

        if ( $this->raw->disableZoom ?? false ) {
            $property->lock = true;
        }

        return new ZoomSettingsSpec( $property );
    }

    public function getSearchMode(): int {
        $value = $this->raw->enableSearch ?? false;
        if ( $value === true ) {
            return self::SM_SELF;
        } elseif ( $value === 'tabberWide' ) {
            return self::SM_TABBER;
        }
        return self::SM_NONE;
    }

    public function isSleepBasedInteractionModel(): int {
        return ( $this->raw->interactionModel ?? 'keybinds' ) === 'sleep';
    }

    public function isLegendDisabled(): bool {
        return $this->raw->hideLegend ?? false;
    }

    public function requiresMarkerIDs(): bool {
        return $this->raw->requireCustomMarkerIDs ?? false;
    }

    public function shouldShowCoordinates(): bool {
        return $this->raw->showCoordinates ?? true;
    }

    public function getChecklistSortMode(): int {
        switch ( $this->raw->sortChecklistsBy ?? 'groupDeclaration' ) {
            case 'amount':
                return self::SC_AMOUNT;
            default:
                return self::SC_GROUP_DECLARATION_ORDER;
        }
    }

    public function getCustomLeafletConfig(): ?object {
        return isset( $this->raw->leaflet ) ? $this->raw->leaflet : null;
    }

    public function validate( Status $status ) {
        $this->checkField( $status, 'allowFullscreen', DataModel::TYPE_BOOL );
        $this->checkField( $status, 'backdropColor', DataModel::TYPE_COLOUR3 );
        $this->checkField( $status, [
            'name' => 'disableZoom',
            'type' => DataModel::TYPE_BOOL,
            '@replaced' => [ '0.16.7', '0.17.0', 'zoom: { lock: true }' ]
        ] );
        $this->checkField( $status, [
            'name' => 'enableSearch',
            'type' => [ DataModel::TYPE_BOOL, DataModel::TYPE_STRING ],
            'values' => [ true, false, 'tabberWide' ]
        ] );
        $this->checkField( $status, 'enableTooltipPopups', DataModel::TYPE_BOOL );
        $this->checkField( $status, 'hideLegend', DataModel::TYPE_BOOL );
        $this->checkField( $status, [
            'name' => 'iconRenderer',
            'type' => DataModel::TYPE_STRING,
            'values' => [
                'auto',
                'DOM',
                'canvas'
            ]
        ] );
        $this->checkField( $status, [
            'name' => 'interactionModel',
            'type' => DataModel::TYPE_STRING,
            'values' => [
                'keybinds',
                'sleep'
            ]
        ] );
        $this->checkField( $status, 'requireCustomMarkerIDs', DataModel::TYPE_BOOL );
        $this->checkField( $status, [
            'name' => 'sortChecklistsBy',
            'type' => DataModel::TYPE_STRING,
            'values' => [
                'groupDeclaration',
                'amount',
                // HACK: v0.15 had this wrongly named, but we have no schema version access here. Temporarily allowing globally
                //       until v1.0.
                'location'
            ]
        ] );
        $this->checkField( $status, 'showCoordinates', DataModel::TYPE_BOOL );
        $this->checkField( $status, [
            'name' => 'zoom',
            'type' => DataModel::TYPE_OBJECT,
            'check' => static function ( $status, $raw ) {
                return ( new ZoomSettingsSpec( $raw ) )->validate( $status );
            }
        ] );
        $this->checkField( $status, [
            'name' => 'leaflet',
            'type' => DataModel::TYPE_OBJECT,
            'check' => static function ( $status, $raw ) {
                return ( new LeafletSettingsSpec( $raw ) )->validate( $status );
            }
        ] );
        $this->disallowOtherFields( $status );
    }
}

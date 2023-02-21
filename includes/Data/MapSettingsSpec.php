<?php
namespace MediaWiki\Extension\DataMaps\Data;

use Status;

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

    public function isZoomDisabled(): bool {
        return $this->raw->disableZoom ?? false;
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
        $this->checkField( $status, 'disableZoom', DataModel::TYPE_BOOL );
        $this->checkField( $status, [
            'name' => 'enableSearch',
            'type' => [ DataModel::TYPE_BOOL, DataModel::TYPE_STRING ],
            'values' => [ true, false, 'tabberWide' ]
        ] );
        $this->checkField( $status, 'hideLegend', DataModel::TYPE_BOOL );
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
            'name' => 'leaflet',
            'type' => DataModel::TYPE_OBJECT,
            'check' => static function ( $status, $raw ) {
                return ( new LeafletSettingsSpec( $raw ) )->validate( $status );
            }
        ] );
        $this->disallowOtherFields( $status );
    }
}

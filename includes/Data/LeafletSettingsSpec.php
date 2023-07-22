<?php
namespace MediaWiki\Extension\DataMaps\Data;

use Status;

/**
 * Stub model with validation only.
 */
class LeafletSettingsSpec extends DataModel {
    protected static string $publicName = 'LeafletSettingsSpec';

    public function validate( Status $status ) {
        // Leaflet built-ins
        $this->checkField( $status, [
            'name' => 'minZoom',
            'type' => DataModel::TYPE_NUMBER,
            '@replaced' => [ '0.16.7', '0.17.0', 'zoom: { min }' ]
        ] );
        $this->checkField( $status, [
            'name' => 'maxZoom',
            'type' => DataModel::TYPE_NUMBER,
            '@replaced' => [ '0.16.7', '0.17.0', 'zoom: { max }' ]
        ] );
        $this->checkField( $status, 'zoomAnimation', DataModel::TYPE_BOOL );
        $this->checkField( $status, 'zoomAnimationThreshold', DataModel::TYPE_NUMBER );
        $this->checkField( $status, 'markerZoomAnimation', DataModel::TYPE_BOOL );
        $this->checkField( $status, 'zoomSnap', DataModel::TYPE_NUMBER );
        $this->checkField( $status, 'zoomDelta', DataModel::TYPE_NUMBER );
        $this->checkField( $status, 'closePopupOnClick', DataModel::TYPE_BOOL );
        $this->checkField( $status, 'zoomControl', DataModel::TYPE_BOOL );
        $this->checkField( $status, 'boxZoom', DataModel::TYPE_BOOL );
        $this->checkField( $status, 'doubleClickZoom', DataModel::TYPE_BOOL );
        $this->checkField( $status, 'dragging', DataModel::TYPE_BOOL );
        $this->checkField( $status, 'inertia', DataModel::TYPE_BOOL );
        $this->checkField( $status, 'inertiaDeceleration', DataModel::TYPE_NUMBER );
        $this->checkField( $status, 'inertiaMaxSpeed', DataModel::TYPE_NUMBER );
        $this->checkField( $status, 'easeLinearity', DataModel::TYPE_NUMBER );
        $this->checkField( $status, 'maxBoundsViscosity', DataModel::TYPE_NUMBER );
        $this->checkField( $status, 'keyboard', DataModel::TYPE_BOOL );
        $this->checkField( $status, 'keyboardPanDelta', DataModel::TYPE_NUMBER );
        $this->checkField( $status, 'scrollWheelZoom', DataModel::TYPE_BOOL );
        $this->checkField( $status, 'wheelDebounceTime', DataModel::TYPE_NUMBER );
        $this->checkField( $status, 'wheelPxPerZoomLevel', DataModel::TYPE_NUMBER );
        $this->checkField( $status, 'tapHold', DataModel::TYPE_BOOL );
        $this->checkField( $status, 'tapTolerance', DataModel::TYPE_NUMBER );
        $this->checkField( $status, 'touchZoom', DataModel::TYPE_BOOL );
        $this->checkField( $status, 'bounceAtZoomLimits', DataModel::TYPE_BOOL );
        // Custom properties
        // TODO: rendererSettings not strict
        $this->checkField( $status, 'rendererSettings', DataModel::TYPE_OBJECT );
        $this->checkField( $status, [
            'name' => 'autoMinZoom',
            'type' => DataModel::TYPE_BOOL,
            '@replaced' => [ '0.16.7', '0.17.0', 'zoom: { auto }' ]
        ] );
        $this->checkField( $status, [
            'name' => 'autoMinZoomAbsolute',
            'type' => DataModel::TYPE_NUMBER,
            '@replaced' => [ '0.16.7', '0.17.0', 'zoom: { min }' ]
        ] );
        $this->checkField( $status, 'shouldScaleMarkers', DataModel::TYPE_BOOL );
        $this->checkField( $status, 'markerZoomScaleFactor', DataModel::TYPE_NUMBER );
        $this->checkField( $status, 'interactionControl', DataModel::TYPE_BOOL );
        $this->checkField( $status, [
            'name' => 'uriPopupZoom',
            'type' => [ DataModel::TYPE_BOOL, DataModel::TYPE_NUMBER ],
            'check' => static function ( Status $status, $value ) {
                if ( is_bool( $value ) && $value !== false ) {
                    $status->fatal( 'datamap-error-validate-disallowed-value', static::$publicName, 'uriPopupZoom',
                        wfMessage( 'datamap-error-validate-check-docs' ) );
                    return false;
                }
                return true;
            }
        ] );

        $this->disallowOtherFields( $status );
    }
}

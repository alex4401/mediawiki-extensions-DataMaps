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
        $this->checkField( $status, 'minZoom', DataModel::TYPE_NUMBER );
        $this->checkField( $status, 'maxZoom', DataModel::TYPE_NUMBER );
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
        $this->checkField( $status, 'autoMinZoom', DataModel::TYPE_BOOL );
        $this->checkField( $status, 'autoMinZoomAbsolute', DataModel::TYPE_NUMBER );
        $this->checkField( $status, 'shouldScaleMarkers', DataModel::TYPE_BOOL );
        $this->checkField( $status, 'markerZoomScaleFactor', DataModel::TYPE_NUMBER );
        $this->checkField( $status, 'interactionControl', DataModel::TYPE_BOOL );

        $this->disallowOtherFields( $status );
    }
}

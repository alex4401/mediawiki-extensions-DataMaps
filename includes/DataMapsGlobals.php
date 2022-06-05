<?php
namespace Ark\DataMaps;

class DataMapsGlobals {
    public static function onRegistration(): bool {
        define( 'ARK_CONTENT_MODEL_DATAMAP', 'datamap' );
        return true;
    }
}
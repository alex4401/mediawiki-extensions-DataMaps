<?php
namespace Ark\DataMaps;

use Parser;

class DataMapsHooks {
    public static function onParserFirstCallInit( Parser $parser ) {
        $parser->setFunctionHook( 'pf-embed-data-map', [ Ark\DataMaps\Rendering\ParserFunction_EmbedDataMap::class, 'run' ] );
    }
}

<?php
namespace Ark\DataMaps;

use Parser;

class DataMapsHooks {
    public static function onParserFirstCallInit( Parser $parser ) {
        $parser->setFunctionHook(
            'pf-embed-data-map',[ Rendering\ParserFunction_EmbedDataMap::class, 'run' ],
            SFH_NO_HASH | SFH_OBJECT_ARGS
        );
    }
}

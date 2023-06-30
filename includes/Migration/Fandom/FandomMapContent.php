<?php
namespace MediaWiki\Extension\DataMaps\Migration\Fandom;

use JsonContent;

class FandomMapContent extends JsonContent {
    public function __construct( $text, $modelId = CONTENT_MODEL_DATAMAPS_FANDOM_COMPAT ) {
        parent::__construct( $text, $modelId );
    }
}

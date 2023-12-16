<?php
namespace MediaWiki\Extension\DataMaps\Migration;

use JsonContent;
use Status;

interface ForeignMapConverter {
    public function validate( JsonContent $content ): Status;
    public function convert( JsonContent $content ): object;
}

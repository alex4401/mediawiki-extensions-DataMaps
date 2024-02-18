<?php
namespace MediaWiki\Extension\DataMaps\Content;

final class SchemaRevision {
    public const REV_17 = 'v17';

    public const SUPPORTED_REVISIONS = [
        self::REV_17,
    ];
    public const DEPRECATED_REVISIONS = [
        // schema revision => extension version to be removed in
    ];
    public const RECOMMENDED_REVISION = self::REV_17;
}

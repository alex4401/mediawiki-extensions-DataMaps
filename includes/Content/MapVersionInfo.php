<?php
namespace MediaWiki\Extension\DataMaps\Content;

final class MapVersionInfo {
    public string $revision;
    public bool $isFragment;

    /**
     * @param string $revision
     * @param bool $isFragment
     */
    public function __construct(
        string $revision,
        bool $isFragment
    ) {
        $this->revision = $revision;
        $this->isFragment = $isFragment;
    }
}

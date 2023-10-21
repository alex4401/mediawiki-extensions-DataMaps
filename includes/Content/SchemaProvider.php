<?php
namespace MediaWiki\Extension\DataMaps\Content;

use MediaWiki\Config\ServiceOptions;
use MediaWiki\MainConfigNames;
use MediaWiki\Utils\UrlUtils;

class SchemaProvider {
    public const SERVICE_NAME = 'DataMaps.SchemaProvider';

    public const SUPPORTED_REVISIONS = [
        SchemaRevision::REV_16,
        SchemaRevision::REV_17,
    ];
    public const RECOMMENDED_REVISION = SchemaRevision::REV_17;
    public const DEPRECATED_REVISIONS = [
        // schema revision => extension version to be removed in
        SchemaRevision::REV_16 => 'v0.18'
    ];

    /**
     * @internal Use only in ServiceWiring
     */
    public const CONSTRUCTOR_OPTIONS = [
        MainConfigNames::ExtensionAssetsPath,
        MainConfigNames::CanonicalServer,
    ];

    /** @var ServiceOptions */
    private ServiceOptions $options;

    /** @var UrlUtils */
    private UrlUtils $urlUtils;

    /**
     * @param ServiceOptions $options
     * @param UrlUtils $urlUtils
     */
    public function __construct(
        ServiceOptions $options,
        UrlUtils $urlUtils
    ) {
        $options->assertRequiredOptions( self::CONSTRUCTOR_OPTIONS );
        $this->options = $options;
        $this->urlUtils = $urlUtils;
    }

    /**
     * Returns whether the revision is supported.
     *
     * @param string $id A SchemaRevision constant.
     * @return bool
     */
    public function isRevisionSupported( string $id ): bool {
        return in_array( $id, self::SUPPORTED_REVISIONS );
    }

    /**
     * Returns the extension version the revision is planned to be dropped in, if any.
     *
     * @param string $id A SchemaRevision constant.
     * @return ?string
     */
    public function getRevisionDeprecationTarget( string $id ): ?string {
        return self::DEPRECATED_REVISIONS[ $id ] ?? null;
    }

    /**
     * Returns base path to the directory containing schemas for URLs.
     *
     * @return string
     */
    private function getBaseExternalPath(): string {
        return $this->options->get( MainConfigNames::ExtensionAssetsPath ) . '/DataMaps/schemas/';
    }

    /**
     * Returns a URL to a JSON schema revision.
     *
     * @param string $id A SchemaRevision constant.
     * @param bool $pathOnly Whether the URL should only consist of a path.
     * @return string
     */
    public function makePublicUrl( string $id, bool $pathOnly = false ): string {
        return $this->urlUtils->expand(
            $this->getBaseExternalPath() . "$id.json",
            $pathOnly ? PROTO_INTERNAL : PROTO_CANONICAL
        );
    }

    /**
     * Returns a URL to the recommended JSON schema revision.
     *
     * @param bool $pathOnly Whether the URL should only consist of a path.
     * @return string
     */
    public function makePublicRecommendedUrl( bool $pathOnly = false ): string {
        return $this->makePublicUrl( self::RECOMMENDED_REVISION, $pathOnly );
    }

    /**
     * Dissects the URL and extracts a schema revision from it.
     *
     * @param string $url
     * @return ?string
     */
    public function getRevisionFromUrl( string $url ): ?string {
        // TODO: there is surely a better way to do this
        $prefixTable = [
            'raw.githubusercontent.com' => '/alex4401/mediawiki-extensions-DataMaps/main/schemas/',
            $this->options->get( MainConfigNames::CanonicalServer ) => $this->getBaseExternalPath(),
        ];

        if ( !str_ends_with( $url, '.json' ) ) {
            return null;
        }

        $url = $this->urlUtils->expand( $url, PROTO_CANONICAL );
        $parsed = $this->urlUtils->parse( $url );
        if ( $parsed === null || !isset( $parsed['host'] ) || !isset( $parsed['path'] )
            || !array_key_exists( $parsed['host'], $prefixTable ) ) {
            return null;
        }

        $prefix = $prefixTable[$parsed['host']];
        if ( !str_starts_with( $parsed['path'], $prefix ) ) {
            return null;
        }

        return substr( $parsed['path'], strlen( $prefix ), -5 );
    }
}

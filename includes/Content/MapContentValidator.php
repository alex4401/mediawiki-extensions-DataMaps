<?php
namespace MediaWiki\Extension\DataMaps\Content;

use JsonSchema\Exception\ResourceNotFoundException;
use Status;
use MediaWiki\Config\ServiceOptions;
use MediaWiki\MainConfigNames;
use MediaWiki\Utils\UrlUtils;
use JsonSchema\SchemaStorage;
use JsonSchema\Validator;
use JsonSchema\Uri\Retrievers\PredefinedArray;
use JsonSchema\Uri\UriRetriever;

class MapContentValidator {
    private const MAX_VALIDATION_ERROR_COUNT = 40;

    private const ERROR_MESSAGE_MAP = [
        'required' => 'datamap-validate-required-field',
        'additionalProp' => 'datamap-validate-unknown-field',
    ];
    private const UNKNOWN_ERROR_MESSAGE = 'datamap-validate-unknown-error';

    /** @var SchemaProvider */
    private SchemaProvider $schemaProvider;
    /** @var SchemaStorage */
    private SchemaStorage $schemaStorage;
    /** @var array */
    private array $schemaVersionMap;

    /**
     * @param SchemaProvider $schemaProvider
     * @param string $localStorePath
     * @param string $remoteRelativeStorePath
     * @param string[] $allowedSchemaHosts
     */
    public function __construct(
        SchemaProvider $schemaProvider,
        string $localStorePath,
        string $remoteRelativeStorePath,
        array $allowedSchemaHosts
    ) {
        $this->schemaProvider = $schemaProvider;

        // Bit of an ugly hack for JsonSchema library to handle relative paths
        $allowedSchemaHosts[] = "internal://provided-schema$remoteRelativeStorePath";

        // TODO: shouldn't load them all upfront, we need a custom retriever

        $schemas = [];
        $this->schemaVersionMap = [];
        foreach ( SchemaProvider::SUPPORTED_REVISIONS as $revision ) {
            $loaded = file_get_contents( "$localStorePath/$revision.json" );
            $this->schemaVersionMap["$remoteRelativeStorePath$revision.json"] = $revision;
            foreach ( $allowedSchemaHosts as $host ) {
                $schemas["$host$revision.json"] = $loaded;
                $this->schemaVersionMap["$host$revision.json"] = $revision;
            }
        }

        $uriRetriever = new UriRetriever();
        $uriRetriever->setUriRetriever( new PredefinedArray( $schemas ) );
        $this->schemaStorage = new SchemaStorage( $uriRetriever );
    }

    private function createValidator(): Validator {
        $factory = new \JsonSchema\Constraints\Factory( $this->schemaStorage );
        $factory->setConstraintClass( 'object', JsonSchemaEx\ObjectConstraintEx::class );
        return new Validator( $factory );
    }

    /**
     * Validates a map's source code for compliance with schema and additional integrity requirements.
     *
     * This is fairly expensive: fragments will be expanded which may cause plenty of page lookups.
     *
     * @param DataMapContent $content
     * @return Status
     */
    public function validate( DataMapContent $content ): Status {
        $result = new Status();
        $contentStatus = $content->getData();

        // Short-circuit if the JSON is bad
        if ( !$contentStatus->isGood() ) {
            $result->fatal( 'datamap-error-validate-invalid-json' );
            return $result;
        }

        if ( $content->isFragment() && isset( $contentStatus->getValue()->include ) ) {
            $result->fatal( 'datamap-error-validatespec-map-mixin-with-mixins' );
            return $result;
        }

        if ( !$this->validateFragmentRefs( $result, $contentStatus->getValue() ) ) {
            return $result;
        }

        $data = $content->expandData();

        /** @var ?string */
        $schemaVersion = null;
        if ( !$this->validateAgainstSchema( $result, $data, $schemaVersion ) || $schemaVersion === null ) {
            return $result;
        }

        if ( !$this->validateAgainstConstraints( $result, $data, $schemaVersion ) ) {
            return $result;
        }

        return $result;
    }

    private function validateFragmentRefs( Status $status, \stdClass $data ): bool {
        $result = true;

        if ( isset( $data->include ) ) {
            $config = MediaWikiServices::getInstance()->get( ExtensionConfig::SERVICE_NAME );

            foreach ( $data->include as $fragmentName ) {
                $title = Title::newFromText( $fragmentName );
                $fragmentPage = -1;
                if ( $title->getNamespace() === $config->getNamespaceId() ) {
                    $fragmentPage = DataMapContent::loadPage( $title );
                }

                if ( is_numeric( $fragmentPage ) || $fragmentPage->getData()->getValue() === null ) {
                    $status->fatal( 'datamap-error-validatespec-map-bad-mixin', wfEscapeWikiText( $fragmentName ) );
                    $result = false;
                }
            }
        }

        return $result;
    }

    private function validateAgainstSchema( Status $result, \stdClass $data, string &$schemaVersion ): bool {
        $validator = $this->createValidator();
        $schemaWasBad = false;

        if ( isset( $data->{'$schema'} ) && is_string( $data->{'$schema'} ) ) {
            try {
                $validator->validate( $data, (object)[ '$ref' => $data->{'$schema'} . '#/definitions/DataMap' ] );
            } catch ( ResourceNotFoundException $exc ) {
                $schemaWasBad = true;
            }
        } else {
            $schemaWasBad = true;
        }

        if ( $schemaWasBad ) {
            $result->fatal( 'datamap-validate-bad-schema' );
        } elseif ( !$validator->isValid() ) {
            $schemaVersion = $this->schemaVersionMap[$data->{'$schema'}];
            
            $errors = $validator->getErrors( Validator::ERROR_DOCUMENT_VALIDATION );
            foreach ( $errors as $error ) {
                $msg = self::ERROR_MESSAGE_MAP[$error['constraint']] ?? self::UNKNOWN_ERROR_MESSAGE;
                $params = [
                    $error['pointer'],
                ];

                switch ( $error['constraint'] ) {
                    case 'additionalProp':
                        $params[0] .= '/' . $error['apProperty'];
                        break;

                    default:
                        break;
                }

                $result->fatal( $msg, ...$params );
            }
        }

        return true;
    }

    private function validateAgainstConstraints( Status $result, \stdClass $data, string $schemaVersion ): bool {
        $checker = new MapDataConstraintChecker( $schemaVersion, $data, $result );
        return $checker->run();
    }
}

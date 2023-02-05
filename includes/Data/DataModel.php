<?php
namespace MediaWiki\Extension\DataMaps\Data;

use InvalidArgumentException;
use MediaWiki\Extension\DataMaps\Rendering\Utils\DataMapColourUtils;
use MediaWiki\Extension\DataMaps\Rendering\Utils\DataMapFileUtils;
use Status;
use stdClass;

class DataModel {
    protected static string $publicName = '???';
    protected static bool $permitAllMetadataFields = true;

    public const TYPE_ANY = 0;
    public const TYPE_ARRAY = 1;
    public const TYPE_STRING = 2;
    public const TYPE_BOOL = 3;
    public const TYPE_NUMBER = 4;
    public const TYPE_OBJECT = 5;
    public const TYPE_VECTOR2 = 11;
    public const TYPE_DIMENSIONS = 12;
    public const TYPE_VECTOR2X2 = 13;
    public const TYPE_BOUNDS = self::TYPE_VECTOR2X2;
    public const TYPE_COLOUR3 = 14;
    public const TYPE_COLOUR4 = 16;
    public const TYPE_FILE = 19;

    protected stdClass $raw;
    private array $validationCheckedFields = [];
    protected bool $validationAreRequiredFieldsPresent = true;
    protected bool $isValidationSuccessful = true;

    public function __construct( stdClass $raw ) {
        if ( is_array( $raw ) ) {
            $raw = (object)$raw;
        }
        $this->raw = $raw;
    }

    public function unwrap(): stdClass {
        return $this->raw;
    }

    protected function verifyType( $var, int $typeId ): bool {
        switch ( $typeId ) {
            case self::TYPE_ANY:
                return true;
            case self::TYPE_ARRAY:
                // A[ ... ]
                return is_array( $var );
            case self::TYPE_STRING:
            case self::TYPE_FILE:
                // S""
                return is_string( $var );
            case self::TYPE_BOOL:
                // B
                return is_bool( $var );
            case self::TYPE_NUMBER:
                // N
                return is_numeric( $var );
            case self::TYPE_OBJECT:
                // O{ ... }
                return $var instanceof stdClass;
            case self::TYPE_VECTOR2:
                // [ Na, Nb ]
                return is_array( $var ) && count( $var ) == 2 && is_numeric( $var[0] ) && is_numeric( $var[1] );
            case self::TYPE_DIMENSIONS:
                // Nab || [ Na, Nb ]
                return is_numeric( $var ) || $this->verifyType( $var, self::TYPE_VECTOR2 );
            case self::TYPE_VECTOR2X2:
                // [ [ Na, Nb ], [ Nc, Nd ] ]
                return is_array( $var ) && count( $var ) == 2
                    && $this->verifyType( $var[0], self::TYPE_VECTOR2 ) && $this->verifyType( $var[1], self::TYPE_VECTOR2 );
            case self::TYPE_COLOUR3:
                // S"#rrggbb" || S"#rgb" || [ Nr, Ng, Nb ]
                return DataMapColourUtils::decode( $var ) !== null;
            case self::TYPE_COLOUR4:
                // S"#rrggbbaa" || S"#rgba" || [ Nr, Ng, Nb, Na ]
                return DataMapColourUtils::decode4( $var ) !== null;
        }
        throw new InvalidArgumentException( wfMessage( 'datamap-error-internal-unknown-field-type', $typeId ) );
    }

    protected function allowOnly( Status $status, array $fields ) {
        $all = array_keys( get_object_vars( $this->raw ) );
        if ( self::$permitAllMetadataFields ) {
            $all = array_filter( $all, fn ( $key ) => !is_string( $key ) || $key[0] !== '$', ARRAY_FILTER_USE_KEY );
        }

        $unexpected = array_diff( $all, $fields );
        if ( !empty( $unexpected ) ) {
            $this->isValidationSuccessful = false;
            $status->fatal( 'datamap-error-validate-unexpected-fields', static::$publicName, wfEscapeWikiText(
                implode( ', ', $unexpected ) ) );
        }
    }

    protected function trackField( string $name ) {
        $this->validationCheckedFields[] = $name;
    }

    protected function disallowOtherFields( Status $status ) {
        $this->allowOnly( $status, $this->validationCheckedFields );
    }

    protected function conflict( Status $status, array $fields ): bool {
        $count = 0;
        foreach ( $fields as &$name ) {
            if ( isset( $this->raw->$name ) ) {
                $count++;
            }
        }
        if ( $count > 1 ) {
            $this->isValidationSuccessful = false;
            $status->fatal( 'datamap-error-validate-exclusive-fields', static::$publicName, implode( ', ', $fields ) );
            return true;
        }
        return false;
    }

    protected function checkField( Status $status, /*array|string*/ $spec, ?int $type = null ): bool {
        if ( is_string( $spec ) ) {
            return $this->checkField( $status, [
                'name' => $spec,
                'type' => $type
            ] );
        }

        $result = true;

        $isRequired = $spec['required'] ?? false;
        $name = $spec['name'] ?? null;
        $types = $spec['type'];
        if ( !is_array( $types ) ) {
            $types = [ $types ];
        }

        if ( isset( $spec['names'] ) ) {
            if ( !$this->conflict( $status, $spec['names'] ) ) {
                foreach ( $spec['names'] as &$candidate ) {
                    if ( isset( $this->raw->$candidate ) ) {
                        $name = $candidate;
                        break;
                    }
                }
            }
        }

        if ( $isRequired && ( $name === null || !isset( $this->raw->$name ) ) ) {
            if ( isset( $spec['names'] ) ) {
                if ( count( $spec['names'] ) === 2 ) {
                    $status->fatal( 'datamap-error-validate-field-required-either', static::$publicName, $spec['names'][0],
                        $spec['names'][1], wfMessage( 'datamap-error-validate-check-docs' ) );
                } else {
                    $status->fatal( 'datamap-error-validate-field-required-alt', static::$publicName, $spec['names'][0],
                        wfMessage( 'datamap-error-validate-check-docs' ) );
                }
            } else {
                $status->fatal( 'datamap-error-validate-field-required', static::$publicName, $spec['name'],
                    wfMessage( 'datamap-error-validate-check-docs' ) );
            }
            $this->validationAreRequiredFieldsPresent = false;
            $this->isValidationSuccessful = false;
            return false;
        }

        if ( !$isRequired && !isset( $this->raw->$name ) ) {
            return true;
        }

        if ( $name === null ) {
            return true;
        }

        if ( isset( $spec['@replaced'] ) ) {
            $info = $spec['@replaced'];
            $status->warning( 'datamap-error-validate-replaced-field', static::$publicName, $name, $info[2], $info[0],
                $info[1] );
        } elseif ( isset( $spec['@pendingRemoval'] ) ) {
            $info = $spec['@replaced'];
            $status->warning( 'datamap-error-validate-deprecated-field', static::$publicName, $name, $info[0], $info[1] );
        }

        $this->trackField( $name );

        $value = $this->raw->$name ?? null;

        $type = null;
        foreach ( $types as &$candidate ) {
            if ( $this->verifyType( $value, $candidate ) ) {
                $type = $candidate;
                break;
            }
        }

        if ( $type === null ) {
            $status->fatal( 'datamap-error-validate-wrong-field-type', static::$publicName, $name,
                wfMessage( 'datamap-error-validate-check-docs' ) );
            $this->isValidationSuccessful = false;
            return false;
        }

        if ( $type === self::TYPE_FILE && ( $spec['fileMustExist'] ?? false ) ) {
            if ( empty( $value ) ) {
                $status->fatal( 'datamap-error-validate-field-no-value', static::$publicName, $name );
                $this->isValidationSuccessful = false;
                return false;
            }

            $file = DataMapFileUtils::getFile( $value );
            if ( !$file || !$file->exists() ) {
                $status->fatal( 'datamap-error-validate-no-file', wfEscapeWikiText( trim( $value ) ) );
                $this->isValidationSuccessful = false;
                return false;
            }
        }

        if ( isset( $spec['check'] ) ) {
            if ( !$spec['check']( $status, $value ) ) {
                $this->isValidationSuccessful = false;
                return false;
            }
        }

        if ( $type === self::TYPE_ARRAY ) {
            if ( isset( $spec['values'] ) ) {
                foreach ( $value as &$item ) {
                    if ( !in_array( $item, $spec['values'] ) ) {
                        $status->fatal( 'datamap-error-validate-disallowed-value', static::$publicName, $name,
                            wfMessage( 'datamap-error-validate-check-docs' ) );
                        $this->isValidationSuccessful = false;
                        return false;
                    }
                }
            }

            if ( isset( $spec['itemType'] ) ) {
                $index = 0;
                foreach ( $value as &$item ) {
                    if ( !$this->verifyType( $item, $spec['itemType'] ) ) {
                        $status->fatal( 'datamap-error-validate-wrong-item-type', static::$publicName, $name, $index,
                            wfMessage( 'datamap-error-validate-check-docs' ) );
                        $this->isValidationSuccessful = false;
                        return false;
                    }
                    $index++;
                }
            }

            if ( isset( $spec['itemCheck'] ) ) {
                foreach ( $value as &$item ) {
                    if ( !$spec['itemCheck']( $status, $item ) ) {
                        $this->isValidationSuccessful = false;
                        return false;
                    }
                }
            }
        } else {
            if ( isset( $spec['values'] ) && !in_array( $value, $spec['values'] ) ) {
                $status->fatal( 'datamap-error-validate-disallowed-value', static::$publicName, $name,
                    wfMessage( 'datamap-error-validate-check-docs' ) );
                $this->isValidationSuccessful = false;
                return false;
            }
        }

        return true;
    }

    public function validate( Status $status ) {
        return $this->isValidationSuccessful;
    }
}

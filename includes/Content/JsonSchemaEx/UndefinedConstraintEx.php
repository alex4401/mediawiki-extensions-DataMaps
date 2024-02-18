<?php

/*
 * This file is part of the JsonSchema package.
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

 namespace MediaWiki\Extension\DataMaps\Content\JsonSchemaEx;

use JsonSchema\Constraints\TypeCheck\LooseTypeCheck;
use JsonSchema\Entity\JsonPointer;
use JsonSchema\Exception\ValidationException;
use JsonSchema\Uri\UriResolver;
use JsonSchema\Constraints\UndefinedConstraint;

/**
 * The UndefinedConstraint Constraints
 *
 * @author Robert Schönthal <seroscho@googlemail.com>
 * @author Bruno Prieto Reis <bruno.p.reis@gmail.com>
 */
class UndefinedConstraintEx extends UndefinedConstraint {
    /**
     * Validate allOf, anyOf, and oneOf properties
     *
     * @param mixed       $value
     * @param mixed       $schema
     * @param JsonPointer $path
     * @param string      $i
     */
    protected function validateOfProperties( &$value, $schema, JsonPointer $path, $i = '' ) {
        // Verify type
        if ( $value instanceof self ) {
            return;
        }

        if ( isset( $schema->allOf ) ) {
            $isValid = true;
            foreach ( $schema->allOf as $allOf ) {
                $initErrors = $this->getErrors();
                $this->checkUndefined( $value, $allOf, $path, $i );
                $isValid = $isValid && ( count( $this->getErrors() ) == count( $initErrors ) );
            }
            if ( !$isValid ) {
                $this->addError( $path, 'Failed to match all schemas', 'allOf' );
            }
        }

        if ( isset( $schema->anyOf ) ) {
            $isValid = false;
            $startErrors = $this->getErrors();
            $discardErrors = true;
            foreach ( $schema->anyOf as $anyOf ) {
                $initErrors = $this->getErrors();
                try {
                    $this->checkUndefined( $value, $anyOf, $path, $i );
                    if ( $isValid = ( count( $this->getErrors() ) == count( $initErrors ) ) ) {
                        break;
                    }

                    // PATCH: Revert newly accumulated errors if there's at least one 'required' constraint failure
                    if ( $discardErrors ) {
                        foreach ( $this->getErrors() as $error ) {
                            if ( $error[ 'constraint' ] === 'required' ) {
                                $this->errors = $initErrors;
                                $discardErrors = false;
                                break;
                            }
                        }
                    }
                } catch ( ValidationException $e ) {
                    $isValid = false;
                }
            }
            if ( !$isValid ) {
                $this->addError( $path, 'Failed to match at least one schema', 'anyOf' );
            } else {
                $this->errors = $startErrors;
            }
        }

        if ( isset( $schema->oneOf ) ) {
            $allErrors = [];
            $matchedSchemas = 0;
            $startErrors = $this->getErrors();
            foreach ( $schema->oneOf as $oneOf ) {
                try {
                    $this->errors = [];
                    $this->checkUndefined( $value, $oneOf, $path, $i );
                    if ( count( $this->getErrors() ) == 0 ) {
                        $matchedSchemas++;
                    }
                    $allErrors = array_merge( $allErrors, array_values( $this->getErrors() ) );
                } catch ( ValidationException $e ) {
                    // deliberately do nothing here - validation failed, but we want to check
                    // other schema options in the OneOf field.
                }
            }
            if ( $matchedSchemas !== 1 ) {
                $this->addErrors( array_merge( $allErrors, $startErrors ) );
                $this->addError( $path, 'Failed to match exactly one schema', 'oneOf' );
            } else {
                $this->errors = $startErrors;
            }
        }
    }
}

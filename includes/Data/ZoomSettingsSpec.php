<?php
namespace MediaWiki\Extension\DataMaps\Data;

use Status;

class ZoomSettingsSpec extends DataModel {
    protected static string $publicName = 'ZoomSettingsSpec';

    /**
     * @var bool
     */
    public const DEFAULT_AUTO = true;

    /**
     * @var float
     */
    public const DEFAULT_MINIMUM = 0.05;

    /**
     * @var float
     */
    public const DEFAULT_MAXIMUM = 6;

    public function isLocked(): bool {
        return $this->raw->lock ?? false;
    }

    public function isMinimumAutomatic(): bool {
        return $this->raw->tryFitEverything ?? self::DEFAULT_AUTO;
    }

    public function getMinimum(): float {
        return $this->raw->min ?? self::DEFAULT_MINIMUM;
    }

    public function getMaximum(): float {
        return $this->raw->max ?? self::DEFAULT_MAXIMUM;
    }

    public function validate( Status $status ) {
        $this->checkField( $status, 'tryFitEverything', DataModel::TYPE_BOOL );
        $this->checkField( $status, [
            'name' => 'min',
            'type' => DataModel::TYPE_NUMBER,
            'check' => static function ( $status, $raw ) {
                if ( $raw > 0 && $raw < 24 ) {
                    return true;
                }

                $status->fatal( 'datamap-error-validate-disallowed-value', static::$publicName, 'min',
                    wfMessage( 'datamap-error-validate-check-docs' ) );
                return false;
            }
        ] );
        $this->conflict( $status, [ 'lock', 'max' ] );
        $this->checkField( $status, 'lock', DataModel::TYPE_BOOL );
        $this->checkField( $status, 'max', DataModel::TYPE_NUMBER );
        $this->disallowOtherFields( $status );
    }
}

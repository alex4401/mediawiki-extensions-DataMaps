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
}

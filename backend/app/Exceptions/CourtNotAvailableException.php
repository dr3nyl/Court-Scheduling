<?php

namespace App\Exceptions;

use Exception;

class CourtNotAvailableException extends Exception
{
    public function __construct(string $message = 'Court is not available for this session.')
    {
        parent::__construct($message);
    }
}

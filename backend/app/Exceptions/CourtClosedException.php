<?php

namespace App\Exceptions;

use Exception;

class CourtClosedException extends Exception
{
    protected $code = 422;

    public function __construct(string $message = 'Court is closed during this time.')
    {
        parent::__construct($message, $this->code);
    }
}

<?php

namespace App\Exceptions;

use Exception;

class TimeSlotUnavailableException extends Exception
{
    protected $code = 422;

    public function __construct(string $message = 'Time slot is already booked.')
    {
        parent::__construct($message, $this->code);
    }
}

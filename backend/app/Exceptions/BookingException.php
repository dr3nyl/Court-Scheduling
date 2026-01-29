<?php

namespace App\Exceptions;

use Exception;

class BookingException extends Exception
{
    protected $code = 422;

    public function __construct(string $message = 'Booking error occurred.', int $code = 422)
    {
        parent::__construct($message, $code);
    }
}

<?php

namespace App\Exceptions;

use Exception;

class MatchNotActiveException extends Exception
{
    public function __construct(string $message = 'Match is not active.')
    {
        parent::__construct($message);
    }
}

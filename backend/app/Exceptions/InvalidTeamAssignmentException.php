<?php

namespace App\Exceptions;

use Exception;

class InvalidTeamAssignmentException extends Exception
{
    public function __construct(string $message = 'Invalid team assignment.')
    {
        parent::__construct($message);
    }
}

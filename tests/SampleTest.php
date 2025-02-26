<?php

use PHPUnit\Framework\TestCase;

class SampleTest extends TestCase
{
    public function testHomePageLoads()
    {
        $this->assertTrue(true);
    }

    public function testApiEndpoint()
    {
        $response = file_get_contents("http://localhost/api/endpoint");
        $this->assertNotFalse($response);
    }
}

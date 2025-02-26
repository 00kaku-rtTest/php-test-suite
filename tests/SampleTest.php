<?php
use PHPUnit\Framework\TestCase;

require_once 'functions.php';

class EmailVerificationTest extends TestCase {
    public function testGenerateVerificationCode() {
        $code = generateVerificationCode();
        $this->assertIsNumeric($code);
        $this->assertGreaterThanOrEqual(100000, $code);
        $this->assertLessThanOrEqual(999999, $code);
    }
    
    public function testRegisterEmail() {
        $email = 'test@example.com';
        registerEmail($email);
        $this->assertStringContainsString($email, file_get_contents('registered_emails.txt'));
    }
    
    public function testUnsubscribeEmail() {
        $email = 'test@example.com';
        unsubscribeEmail($email);
        $emails = file('registered_emails.txt', FILE_IGNORE_NEW_LINES);
        $this->assertNotContains($email, $emails);
    }
    
    public function testFormatGitHubData() {
        $data = [['event' => 'push', 'user' => 'testuser']];
        $formatted = formatGitHubData($data);
        $this->assertJson($formatted);
    }
}

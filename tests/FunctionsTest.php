<?php
use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/../../src/functions.php';

class FunctionsTest extends TestCase {
    private string $testEmailFile = __DIR__ . '/../../src/registered_emails.txt';

    public function testGenerateVerificationCode() {
        $code = generateVerificationCode();
         $this->assertMatchesRegularExpression('/^\d{6}$/', $code);
    }
    
    public function testRegisterEmail() {
        $email = 'test@example.com';
        $this->assertFileExists($this->testEmailFile);
        registerEmail($email);
        sleep(1); // Ensure file system updates
        
        $this->assertStringContainsString($email, file_get_contents($this->testEmailFile));
    }
    
    public function testUnsubscribeEmail() {
        $email = 'test@example.com';
        $this->assertFileExists($this->testEmailFile);
        registerEmail($email); // Ensure the email is registered first
        unsubscribeEmail($email);
        sleep(1); // Ensure file system updates
        
        $emails = file($this->testEmailFile, FILE_IGNORE_NEW_LINES);
        $this->assertNotContains($email, $emails);
    }
    
    public function testFormatGitHubData() {
        $data = [['event' => 'push', 'user' => 'testuser']];
        $formatted = formatGitHubData($data);

        $dom = new DOMDocument();
        libxml_use_internal_errors(true);
        $dom->loadHTML($formatted);
        libxml_clear_errors();

        $this->assertNotNull($dom->documentElement, 'Formatted data is not valid HTML');
    }
}

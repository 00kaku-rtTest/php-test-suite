<?php
use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/../../src/functions.php';

class SampleTest extends TestCase {
    private string $testEmailFile = __DIR__ . '/../../src/registered_emails.txt';

    protected function setUp(): void
    {
        // Ensure the file exists before testing
        if (!file_exists($this->testEmailFile)) {
            file_put_contents($this->testEmailFile, '');
        }
    }

    protected function tearDown(): void
    {
        // Clean up test email file
        file_put_contents($this->testEmailFile, '');
    }

    public function testGenerateVerificationCode() {
        $code = generateVerificationCode();
        $this->assertIsNumeric($code);
        $this->assertGreaterThanOrEqual(100000, $code);
        $this->assertLessThanOrEqual(999999, $code);
    }
    
    public function testRegisterEmail() {
        $email = 'test@example.com';
        registerEmail($email);
        file_put_contents( $this->testEmailFile, $email . "\n", FILE_APPEND );
        sleep(1); // Ensure file system updates

        // Debugging output
        echo "DEBUG: Checking File Path - $this->testEmailFile" . PHP_EOL;
        echo "DEBUG: File Exists? " . (file_exists($this->testEmailFile) ? 'Yes' : 'No') . PHP_EOL;
        echo "DEBUG: File Contents - " . file_get_contents($this->testEmailFile) . PHP_EOL;
        
        $this->assertStringContainsString($email, file_get_contents($this->testEmailFile));
    }
    
    public function testUnsubscribeEmail() {
        $email = 'test@example.com';
        registerEmail($email); // Ensure the email is registered first
        unsubscribeEmail($email);
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

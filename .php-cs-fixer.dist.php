<?php
$copyrightYear = date('Y');
$header = <<<EOT
Aphiria

@link      https://www.aphiria.com
@copyright Copyright (C) {$copyrightYear} David Young
@license   https://github.com/aphiria/aphiria.com/blob/master/LICENSE.md
EOT;

return new PhpCsFixer\Config()
    ->setRules([
        '@PER-CS2.0' => true,
        'array_syntax' => ['syntax' => 'short'],
        'blank_line_after_opening_tag' => true,
        'compact_nullable_type_declaration' => true,
        'concat_space' => ['spacing' => 'one'],
        'declare_equal_normalize' => ['space' => 'none'],
        'declare_strict_types' => true,
        'header_comment' => [
            'header' => $header,
            'comment_type' => 'PHPDoc',
            'location' => 'after_open'
        ],
        'method_argument_space' => ['on_multiline' => 'ensure_fully_multiline'],
        // A very tiny micro-optimization to reduce the number of opcodes for native function calls
        'native_function_invocation' => ['include' => ['@all']],
        'new_with_parentheses' => true,
        'no_empty_comment' => true,
        'no_empty_statement' => true,
        'no_leading_import_slash' => true,
        'no_leading_namespace_whitespace' => true,
        'no_unneeded_control_parentheses' => [
            'statements' => [
                'break',
                'clone',
                'continue',
                'echo_print',
                'return',
                'switch_case',
                'yield',
                'yield_from'
            ]
        ],
        'no_unused_imports' => true,
        'no_whitespace_in_blank_line' => true,
        'ordered_class_elements' => [
            'order' => [
                'use_trait',
                'constant_public',
                'constant_protected',
                'constant_private',
                'property_public_static',
                'property_public',
                'property_protected_static',
                'property_protected',
                'property_private_static',
                'property_private',
                'construct',
                'destruct',
                'magic',
                'phpunit',
                'method_public_static',
                'method_public_abstract',
                'method_public',
                'method_protected_static',
                'method_protected_abstract',
                'method_protected',
                'method_private_static',
                'method_private'
            ],
            'sort_algorithm' => 'alpha'
        ],
        'ordered_imports' => true,
        'return_type_declaration' => ['space_before' => 'none'],
        'single_quote' => true,
        'single_trait_insert_per_statement' => true,
        'standardize_not_equals' => true,
        'type_declaration_spaces' => true
    ])
    ->setRiskyAllowed(true)
    ->setFinder(
        PhpCsFixer\Finder::create()->in(__DIR__)
    );

import pytest

from backend import import_resolver as ir


def test_import_from_possible_locations_not_found():
    with pytest.raises(ImportError):
        ir.import_from_possible_locations("this_module_does_not_exist_abc123")


def test_import_names_attribute_missing():
    # Should import stdlib math but fail to find a bogus attribute
    with pytest.raises(ImportError):
        ir.import_names("math", "definitely_not_an_attribute_zzz")
